"""
Scraping asynchrone des fiches détail vins — workers parallèles.
Usage : python scrape_details_async.py [--workers N] [--limit N]
Défaut : 8 workers simultanés, toutes les fiches restantes.
"""
import sys
import os
import asyncio
import argparse
import logging
import json
import time
from datetime import datetime, timezone
from typing import Optional

sys.path.insert(0, os.path.dirname(__file__))

import config  # charge .env depuis la racine
from fetcher import parse_wine_detail_html
from db_pg import get_db

log = logging.getLogger(__name__)

# ── Options fetch Scrapling ──────────────────────────────────────────────────
FETCH_OPTS = dict(
    headless=True,
    network_idle=True,
    disable_resources=True,   # ignore fonts/images/media → rapide
    google_search=True,       # referer Google → naturel
    timeout=25000,            # 25s max par page
)


async def fetch_one(url: str, semaphore: asyncio.Semaphore) -> Optional[str]:
    """Fetch asynchrone d'une URL avec limite de concurrence."""
    async with semaphore:
        try:
            page = await config.FETCHER.async_fetch(url, **FETCH_OPTS)
            if page and page.status == 200 and len(page.html_content) > 500:
                return page.html_content
            log.warning(f"  HTTP {page.status if page else '?'} : {url[:80]}")
        except Exception as e:
            log.debug(f"  Erreur fetch {url[:60]}: {e}")
    return None


async def run(workers: int, limit: Optional[int]):
    conn = get_db()
    cur = conn.cursor()

    # Récupérer les URLs à scraper
    query = """
        SELECT DISTINCT v.link
        FROM vintages v
        LEFT JOIN wine_details wd ON wd.url = v.link
        WHERE v.link IS NOT NULL AND v.link != ''
          AND wd.url IS NULL
        ORDER BY v.link
    """
    if limit:
        query += f" LIMIT {limit}"
    cur.execute(query)
    rows = cur.fetchall()
    urls = [r['link'] for r in rows]

    total = len(urls)
    log.info(f"=== {total} fiches détail à scraper ({workers} workers) ===")
    if total == 0:
        log.info("Rien à faire.")
        conn.close()
        return

    semaphore = asyncio.Semaphore(workers)
    done = 0
    errors = 0
    batch = []
    batch_size = workers * 2  # commit toutes les N*2 fiches
    t0 = time.time()

    async def process(url: str):
        nonlocal done, errors
        html = await fetch_one(url, semaphore)
        if html:
            detail = parse_wine_detail_html(html)
            detail['wine_type_label'] = detail.get('color', '')
            return url, detail
        else:
            errors += 1
            return url, None

    # Traitement par chunks pour éviter de créer 190k coroutines d'un coup
    CHUNK = workers * 10
    for i in range(0, total, CHUNK):
        chunk_urls = urls[i:i + CHUNK]
        tasks = [process(u) for u in chunk_urls]
        results = await asyncio.gather(*tasks)

        for url, detail in results:
            if detail is not None:
                batch.append((url, json.dumps(detail, ensure_ascii=False)))
                done += 1
            # Upsert si batch plein
            if len(batch) >= batch_size:
                _flush(conn, batch)
                batch.clear()

        # Flush restant du chunk
        if batch:
            _flush(conn, batch)
            batch.clear()

        # Progression
        elapsed = time.time() - t0
        rate = done / elapsed if elapsed > 0 else 0
        remaining_n = total - i - len(chunk_urls)
        eta_s = remaining_n / rate if rate > 0 else 0
        eta_h = eta_s / 3600
        log.info(
            f"  [{done + errors}/{total}] {done} OK · {errors} err · "
            f"{rate:.1f}/s · ETA ~{eta_h:.1f}h"
        )

    # Flush final
    if batch:
        _flush(conn, batch)

    elapsed = time.time() - t0
    log.info(f"=== TERMINÉ: {done} scrapées, {errors} erreurs, {elapsed/60:.0f} min ===")
    conn.close()


def _flush(conn, batch: list):
    """Upsert un batch de (url, data_json) dans wine_details."""
    if not batch:
        return
    cur = conn.cursor()
    now = datetime.now(timezone.utc)
    for url, data_json in batch:
        cur.execute("""
            INSERT INTO wine_details (url, data, fetched_at)
            VALUES (%s, %s::jsonb, %s)
            ON CONFLICT (url) DO UPDATE
              SET data = EXCLUDED.data,
                  fetched_at = EXCLUDED.fetched_at
        """, (url, data_json, now))
        # Mettre à jour stars et color dans vintages
        try:
            d = json.loads(data_json)
            if d.get('stars') or d.get('color'):
                updates, vals = [], []
                if d.get('stars'):
                    updates.append("stars = %s")
                    vals.append(d['stars'])
                if d.get('color'):
                    updates.append("color = %s")
                    vals.append(d['color'])
                if updates:
                    vals.append(url)
                    cur.execute(
                        f"UPDATE vintages SET {', '.join(updates)} WHERE link = %s",
                        vals
                    )
        except Exception:
            pass
    conn.commit()
    log.debug(f"  Batch {len(batch)} upserted")


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=8,
                        help='Nombre de workers parallèles (défaut: 8)')
    parser.add_argument('--limit', type=int, default=None,
                        help='Limiter à N fiches (test)')
    args = parser.parse_args()

    if not config.SCRAPLING_OK:
        log.error("Scrapling non disponible — vérifiez l'installation de patchright")
        sys.exit(1)

    log.info(f"Scrapling OK · {args.workers} workers · limit={args.limit}")
    asyncio.run(run(args.workers, args.limit))
