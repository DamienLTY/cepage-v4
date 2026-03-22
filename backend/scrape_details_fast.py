"""
Scraping rapide des fiches détail — aiohttp + queue continue + fallback Scrapling.
Modèle producer/consumer : les workers sont TOUJOURS actifs, pas de chunk-wait.
Commits DB toutes les 200 fiches.

Stratégie anti-blocage :
  - Mode RAPIDE (défaut) : aiohttp, 80 workers, ~5 req/s
  - Mode STEALTH (auto) : dès le 1er blocage (403/429/503), bascule vers
    Scrapling StealthyFetcher (Playwright headless stealth) — beaucoup plus lent
    (~5-15s/page) mais contourne les anti-bots. Concurrence limitée à 5.

Usage : python scrape_details_fast.py [--workers N] [--limit N] [--stealth]
Défaut : 80 workers, bascule auto vers stealth sur blocage.
"""
import sys
import os
import asyncio
import argparse
import logging
import json
import time
import random
import concurrent.futures
from datetime import datetime, timezone
from typing import Optional

sys.path.insert(0, os.path.dirname(__file__))

import config  # charge .env
from fetcher import parse_wine_detail_html
from db_pg import get_db

log = logging.getLogger(__name__)

# ── Scrapling (StealthyFetcher) — disponibilité optionnelle ──────────────────
_SCRAPLING_OK = False
try:
    from scrapling.fetchers import StealthyFetcher as _SF
    _SCRAPLING_OK = True
    log.info("[OK] Scrapling (StealthyFetcher) disponible — fallback stealth activé")
except ImportError:
    log.warning("[WARN] Scrapling indisponible — pas de fallback stealth")

# ── Semaphore stealth : max 5 instances Playwright simultanées ───────────────
_STEALTH_SEM: Optional[asyncio.Semaphore] = None   # initialisé dans run()

# ── Compteur de blocages consécutifs (partagé entre workers) ─────────────────
# On utilise une liste[int] pour mutabilité dans les closures async
_block_count: list[int] = [0]
_stealth_mode: list[bool] = [False]   # True = tous les workers passent en stealth

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
]

REFERERS = [
    "https://www.google.com/search?q=hachette+vins+guide",
    "https://www.hachette-vins.com/guide-vins/les-vins/",
    "https://www.hachette-vins.com/",
    "https://www.hachette-vins.com/guide-vins/",
]


def _headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": random.choice(REFERERS),
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


def _scrapling_fetch_sync(url: str) -> Optional[str]:
    """
    Fetch synchrone via Scrapling StealthyFetcher (Playwright headless stealth).
    Appelé depuis un thread executor pour ne pas bloquer la boucle async.
    Retourne le HTML ou None en cas d'échec.
    """
    if not _SCRAPLING_OK:
        return None
    try:
        _SF.configure(auto_match=False)
        page = _SF.fetch(
            url,
            headless=True,
            network_idle=True,
            timeout=60_000,   # 60s max par page
        )
        html = page.html_content if hasattr(page, 'html_content') else str(page)
        if html and len(html) > 500:
            return html
    except Exception as e:
        log.debug(f"[scrapling] err sur {url}: {e}")
    return None


async def _fetch_stealth(url: str, loop, executor) -> Optional[str]:
    """Wrapper async pour _scrapling_fetch_sync, limité par _STEALTH_SEM."""
    async with _STEALTH_SEM:
        return await loop.run_in_executor(executor, _scrapling_fetch_sync, url)


async def worker(worker_id: int, queue: asyncio.Queue, results: asyncio.Queue,
                 session, rate_event: asyncio.Event, loop, executor):
    """
    Worker continu : prend une URL, fetch via aiohttp (rapide) ou Scrapling
    (stealth, lent) selon l'état global de blocage.
    """
    while True:
        try:
            url = queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        html = None

        # ── Mode STEALTH global : Scrapling directement ───────────────────
        if _stealth_mode[0] and _SCRAPLING_OK:
            html = await _fetch_stealth(url, loop, executor)

        else:
            # ── Mode RAPIDE : aiohttp ─────────────────────────────────────
            for attempt in range(3):
                # Pause si rate-limité
                if rate_event.is_set():
                    await asyncio.sleep(15)
                    rate_event.clear()

                try:
                    async with session.get(url, headers=_headers(),
                                           timeout=aiohttp.ClientTimeout(total=25),
                                           ssl=False) as resp:
                        if resp.status == 200:
                            text = await resp.text(errors='replace')
                            if len(text) > 500:
                                html = text
                                _block_count[0] = 0   # succès → reset blocages
                                break
                        elif resp.status == 429:
                            log.warning(f"[w{worker_id}] 429 — blocage détecté")
                            rate_event.set()
                            _block_count[0] += 1
                            await asyncio.sleep(15 + attempt * 10)
                        elif resp.status in (403, 503):
                            _block_count[0] += 1
                            log.debug(f"[w{worker_id}] {resp.status} — blocage #{_block_count[0]}")
                            await asyncio.sleep(3 + attempt * 3)
                        else:
                            break
                except asyncio.TimeoutError:
                    await asyncio.sleep(1 + attempt)
                except Exception as e:
                    log.debug(f"[w{worker_id}] err: {e}")
                    await asyncio.sleep(1)

            # ── Basculer en mode STEALTH dès le 1er blocage ───────────────
            if html is None and _block_count[0] >= 1 and _SCRAPLING_OK:
                if not _stealth_mode[0]:
                    log.warning(
                        f"[w{worker_id}] {_block_count[0]} blocage(s) — "
                        f"BASCULE STEALTH (Scrapling, lent mais furtif)"
                    )
                    _stealth_mode[0] = True
                html = await _fetch_stealth(url, loop, executor)

        await results.put((url, html))
        queue.task_done()


def _flush(conn, batch: list):
    if not batch:
        return
    cur = conn.cursor()
    now = datetime.now(timezone.utc)
    for url, data_json in batch:
        cur.execute("""
            INSERT INTO wine_details (url, data, fetched_at)
            VALUES (%s, %s::jsonb, %s)
            ON CONFLICT (url) DO UPDATE
              SET data = EXCLUDED.data, fetched_at = EXCLUDED.fetched_at
        """, (url, data_json, now))
        try:
            d = json.loads(data_json)
            updates, vals = [], []
            if d.get('stars'):
                updates.append("stars = %s"); vals.append(d['stars'])
            if d.get('color'):
                updates.append("color = %s"); vals.append(d['color'])
            if updates:
                vals.append(url)
                cur.execute(f"UPDATE vintages SET {', '.join(updates)} WHERE link = %s", vals)
        except Exception:
            pass
    conn.commit()


async def run(workers: int, limit: Optional[int], force_stealth: bool = False):
    global _STEALTH_SEM

    try:
        import aiohttp as _aiohttp
        global aiohttp
        aiohttp = _aiohttp
    except ImportError:
        log.error("pip install aiohttp")
        sys.exit(1)

    # Initialiser le semaphore stealth (max 5 Playwright simultanés)
    _STEALTH_SEM = asyncio.Semaphore(5)

    # Réinitialiser l'état global entre runs
    _block_count[0] = 0
    _stealth_mode[0] = force_stealth

    if force_stealth:
        log.info("[MODE] Stealth forcé — Scrapling uniquement")
    elif _SCRAPLING_OK:
        log.info("[MODE] Hybride — aiohttp rapide + bascule Scrapling sur 1er blocage")
    else:
        log.info("[MODE] aiohttp uniquement (Scrapling indisponible)")

    conn = get_db()
    cur = conn.cursor()

    q = """
        SELECT DISTINCT v.link FROM vintages v
        LEFT JOIN wine_details wd ON wd.url = v.link
        WHERE v.link IS NOT NULL AND v.link != '' AND wd.url IS NULL
        ORDER BY v.link
    """
    if limit:
        q += f" LIMIT {limit}"
    cur.execute(q)
    urls = [r['link'] for r in cur.fetchall()]
    total = len(urls)
    log.info(f"=== {total} fiches à scraper ({workers} workers) ===")
    if total == 0:
        log.info("Rien à faire.")
        conn.close()
        return

    # Remplir la queue
    url_queue = asyncio.Queue()
    for u in urls:
        url_queue.put_nowait(u)
    results_queue = asyncio.Queue()
    rate_event = asyncio.Event()

    connector = aiohttp.TCPConnector(
        limit=workers + 20,
        ttl_dns_cache=600,
        force_close=False,
        enable_cleanup_closed=True,
    )

    done = 0
    errors = 0
    batch = []
    COMMIT_EVERY = 200
    t0 = time.time()
    last_log = t0

    loop = asyncio.get_event_loop()
    # Thread pool pour les appels Scrapling synchrones (max 5 threads = même que semaphore)
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=5)

    async with aiohttp.ClientSession(connector=connector) as session:
        # Lancer tous les workers
        worker_tasks = [
            asyncio.create_task(
                worker(i, url_queue, results_queue, session, rate_event, loop, executor)
            )
            for i in range(workers)
        ]

        processed = 0
        while processed < total:
            url, html = await results_queue.get()
            processed += 1

            if html:
                detail = parse_wine_detail_html(html)
                if detail:
                    batch.append((url, json.dumps(detail, ensure_ascii=False)))
                    done += 1
                else:
                    errors += 1
            else:
                errors += 1

            # Commit périodique
            if len(batch) >= COMMIT_EVERY:
                _flush(conn, batch)
                batch.clear()

            # Log de progression toutes les 30s
            now = time.time()
            if now - last_log >= 30:
                elapsed = now - t0
                rate = processed / elapsed
                remaining = total - processed
                eta_h = (remaining / rate) / 3600 if rate > 0 else 0
                mode = "🕵️ stealth" if _stealth_mode[0] else "⚡ rapide"
                log.info(
                    f"  [{processed}/{total}] {done} OK · {errors} err · "
                    f"{rate:.1f} req/s · ETA ~{eta_h:.1f}h [{mode}]"
                )
                last_log = now

        # Flush final
        if batch:
            _flush(conn, batch)

        await asyncio.gather(*worker_tasks, return_exceptions=True)

    executor.shutdown(wait=False)
    elapsed = time.time() - t0
    log.info(f"=== TERMINÉ: {done} scrapées · {errors} erreurs · {elapsed/60:.0f} min ===")
    conn.close()


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=80)
    parser.add_argument('--limit', type=int, default=None)
    parser.add_argument('--stealth', action='store_true',
                        help='Forcer le mode Scrapling stealth dès le départ')
    args = parser.parse_args()
    asyncio.run(run(args.workers, args.limit, force_stealth=args.stealth))
