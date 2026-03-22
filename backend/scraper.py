#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scraper.py — Logique de scraping + état partagé (progress, queue)

État partagé : _scrape_progress et _progress_queue sont importés par les routes
pour le flux SSE (/api/scrape/progress).
"""

import re
import json
import time
import logging
import threading
import traceback
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from queue import Queue
from urllib.parse import quote_plus

from config import BASE_URL, REGIONS, GUIDE_YEAR
from db_pg import get_db, normalize
import config
from fetcher import (
    fetch_html, test_connection, parse_wine_blocks,
    fetch_detail_stars, _fix_guide_stars_batch,
    extract_all_producer_codes, fetch_wine_detail,
)

log = logging.getLogger("backend")


# ==============================================================================
#  ÉTAT PARTAGÉ (utilisé par les routes SSE)
# ==============================================================================
_scrape_progress: Dict = {
    "running": False, "type": None, "percent": 0, "phase": "",
    "detail": "", "producers": 0, "vintages": 0, "started_at": None, "error": None,
}
_progress_queue: Queue = Queue()


def _push_progress(**kwargs):
    _scrape_progress.update(kwargs)
    _progress_queue.put(dict(_scrape_progress))


# ==============================================================================
#  HELPERS PARSING
# ==============================================================================
def _parse_producer_listing_page(html: str) -> List[tuple]:
    """Parse une page /producteurs/page-N/list/ et retourne liste de (code, name, url)."""
    from bs4 import BeautifulSoup
    if not html:
        return []

    results = []
    seen = set()
    soup = BeautifulSoup(html, 'html.parser')

    for a in soup.select('a[href]'):
        href = a.get('href', '')

        m = re.search(r'/producteu[rs]+/(?:code_producteur/)?(\d+)/', href)
        if not m:
            m = re.search(r'code_producteur[=/](\d+)', href)
        if not m:
            continue

        code = m.group(1)
        raw = a.get_text(separator=' ', strip=True)
        name = re.sub(r'\s*\|.*$', '', raw).strip()
        name = re.sub(r'\s+', ' ', name).strip()

        if not name or len(name) < 2:
            continue
        if code in seen:
            continue
        seen.add(code)

        full_url = href if href.startswith('http') else f"https://www.hachette-vins.com{href}"
        results.append((code, name, full_url))

    return results


def _scrape_all_producers_from_region(region_param: str) -> List[str]:
    """Récupère les codes producteurs pour une région (via pages /vins/)."""
    codes = []
    seen = set()

    for page in range(1, 50):
        url = f"{BASE_URL}/vins/page-{page}/list/?filtre%5Bregion%5D={quote_plus(region_param)}&sort%5Bmillesime%5D=desc"
        log.info(f"  Page {page} region {region_param[:30]}...")

        html = fetch_html(url, delay=1.5)
        if not html:
            log.warning(f"    Pas de réponse")
            break

        new_codes = extract_all_producer_codes(html)
        log.info(f"    {len(new_codes)} codes trouvés")

        if not new_codes and page > 1:
            if 'custom-block' not in html and len(parse_wine_blocks(html)) == 0:
                log.info(f"    Fin pagination")
                break

        added = 0
        for c in new_codes:
            if c not in seen:
                seen.add(c)
                codes.append(c)
                added += 1

        log.info(f"    {added} nouveaux (total: {len(codes)})")
        if added == 0 and page > 1:
            break

    return codes


# ==============================================================================
#  SCRAPING PRODUCTEURS
# ==============================================================================
def run_scrape_producers_region(region_key: str) -> int:
    """Scrape tous les producteurs d'une région. Retourne le nombre insérés/MàJ."""
    region_param = REGIONS.get(region_key, region_key)
    conn = get_db()
    total = 0

    log.info(f"Scraping producteurs région: {region_key} (param: {region_param})")
    _push_progress(phase=f"Producteurs {region_key}", detail="Démarrage...", percent=0)

    page = 1
    empty_pages = 0

    try:
        while True:
            url = (f"{BASE_URL}/producteurs/page-{page}/list/"
                   f"?search=&filtre%5Bregion%5D={quote_plus(region_param)}")

            log.info(f"  Page {page} région {region_key}...")
            html = fetch_html(url, delay=1.5)

            if not html:
                log.warning(f"    Pas de réponse page {page}")
                empty_pages += 1
                if empty_pages >= 2:
                    break
                continue

            producers = _parse_producer_listing_page(html)
            log.info(f"    {len(producers)} producteurs trouvés")

            if not producers:
                if 'producteur' not in html.lower() and page > 1:
                    log.info(f"    Fin pagination page {page}")
                    break
                empty_pages += 1
                if empty_pages >= 3:
                    break
                page += 1
                continue

            empty_pages = 0

            for code, name, prod_url in producers:
                conn.execute(
                    "INSERT INTO producers (code, name, region, producer_url, last_scraped)"
                    " VALUES (%s, %s, %s, %s, %s)"
                    " ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, region=EXCLUDED.region,"
                    " producer_url=EXCLUDED.producer_url, last_scraped=EXCLUDED.last_scraped",
                    (code, name, region_key, prod_url, datetime.now().isoformat())
                )
                total += 1

            conn.commit()
            _push_progress(detail=f"Page {page} — {total} producteurs", percent=min(page // 3, 90))
            page += 1
    finally:
        conn.close()

    log.info(f"Région {region_key}: {total} producteurs scrapés")
    return total


def run_scrape_producers_all():
    """Scrape tous les producteurs de toutes les régions."""
    _scrape_progress.update({
        "running": True, "type": "scrape_producers", "percent": 0,
        "phase": "Scraping producteurs", "detail": "Démarrage...",
        "producers": 0, "vintages": 0, "error": None,
        "started_at": datetime.now().isoformat()
    })

    total = 0
    regions = list(REGIONS.keys())

    try:
        for i, region_key in enumerate(regions):
            _push_progress(
                phase=f"Producteurs {region_key} ({i+1}/{len(regions)})",
                detail="...",
                percent=int((i / len(regions)) * 90)
            )
            count = run_scrape_producers_region(region_key)
            total += count
            _scrape_progress["producers"] = total

        _push_progress(phase="Terminé", detail=f"{total} producteurs scrapés", percent=100)
    except Exception as e:
        log.error(f"Erreur scraping producteurs: {e}", exc_info=True)
        _scrape_progress["error"] = str(e)
    finally:
        _scrape_progress["running"] = False


def backfill_producer_regions_from_wines(only_region: str = None) -> int:
    """Popule producers.region pour les producteurs slug (sans région) depuis les pages de vins."""
    conn = get_db()
    total_updated = 0
    if only_region:
        regions = [(only_region, REGIONS[only_region])] if only_region in REGIONS else []
    else:
        regions = list(REGIONS.items())

    _scrape_progress.update({
        "running": True, "type": "backfill_regions", "percent": 0,
        "phase": "Backfill régions", "detail": "Démarrage...",
        "producers": 0, "vintages": 0, "error": None,
        "started_at": datetime.now().isoformat()
    })

    try:
        for r_idx, (region_key, region_param) in enumerate(regions):
            log.info(f"Backfill région {region_key} ({region_param})...")
            updated_this_region = 0
            page = 1
            empty_count = 0

            while True:
                url = (f"{BASE_URL}/vins/page-{page}/list/"
                       f"?filtre%5Bregion%5D={quote_plus(region_param)}&sort%5Bmillesime%5D=desc")
                html = fetch_html(url, delay=1.0)

                if not html:
                    empty_count += 1
                    if empty_count >= 2:
                        break
                    page += 1
                    continue

                items = parse_wine_blocks(html)
                if not items:
                    break

                seen_codes: set = set()
                for item in items:
                    prod_code = item.get('producer_code', '')
                    if prod_code and prod_code not in seen_codes:
                        seen_codes.add(prod_code)
                        result = conn.execute(
                            "UPDATE producers SET region=%s WHERE code=%s AND (region IS NULL OR region='')",
                            (region_key, prod_code)
                        )
                        if result.rowcount > 0:
                            updated_this_region += 1
                            total_updated += 1

                conn.commit()
                pct = int(((r_idx + page / 250) / len(regions)) * 90)
                _push_progress(
                    phase=f"Backfill {region_key} ({r_idx+1}/{len(regions)})",
                    detail=f"Page {page} — {updated_this_region} mis à jour",
                    percent=min(pct, 90),
                    producers=total_updated
                )
                page += 1
                empty_count = 0

            log.info(f"  {region_key}: {updated_this_region} producteurs mis à jour")

        _push_progress(phase="Terminé", detail=f"{total_updated} producteurs mis à jour", percent=100)
    except Exception as e:
        log.error(f"Erreur backfill régions: {e}", exc_info=True)
        _scrape_progress["error"] = str(e)
    finally:
        _scrape_progress["running"] = False
        conn.close()

    return total_updated


# ==============================================================================
#  SCRAPING PAR PRODUCTEUR
# ==============================================================================
def _scrape_producer(conn, code: str, region: str = None) -> int:
    """Scrappe un producteur et insère ses millésimes en DB."""
    all_vintages = []
    producer_name = None

    for page in range(1, 20):
        url = f"{BASE_URL}/vins/page-{page}/list/?filtre%5Bcode_producteur%5D={code}&sort%5Bmillesime%5D=desc"
        html = fetch_html(url, delay=1.0)

        if not html:
            break

        items = parse_wine_blocks(html)
        log.debug(f"    Prod {code} page {page}: {len(items)} vins")

        if not items:
            break

        all_vintages.extend(items)
        if producer_name is None and items:
            producer_name = items[0]['name']

    if not all_vintages:
        return 0

    if producer_name:
        conn.execute(
            "INSERT INTO producers (code, name, region, last_scraped) VALUES (%s,%s,%s,%s)"
            " ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, region=EXCLUDED.region,"
            " last_scraped=EXCLUDED.last_scraped",
            (code, producer_name, region, datetime.now().isoformat())
        )

    inserted = 0
    for v in all_vintages:
        conn.execute(
            "INSERT INTO vintages (producer_code, wine_name, year, stars, color, wine_type, link, guide_year)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s)"
            " ON CONFLICT (producer_code, wine_name, year, color)"
            " DO UPDATE SET stars=EXCLUDED.stars, wine_type=EXCLUDED.wine_type, link=EXCLUDED.link, guide_year=EXCLUDED.guide_year",
            (code, v['name'], v['year'], v['stars'], v['color'], v['wine_type'], v['link'], config.GUIDE_YEAR)
        )
        inserted += 1

    conn.commit()
    return inserted


# ==============================================================================
#  SCRAPING COMPLET
# ==============================================================================
def run_full_scrape():
    """Scraping complet — itère toutes les pages /vins/page-N/list/?search="""
    conn = get_db()
    c = conn.cursor()

    c.execute(
        "INSERT INTO scrape_log (scrape_type, started_at, status, details)"
        " VALUES (%s,%s,%s,%s) RETURNING id",
        ('full', datetime.now().isoformat(), 'running', 'Démarrage...')
    )
    log_id = c.fetchone()['id']
    conn.commit()

    _push_progress(running=True, type='full', percent=0,
                   phase='Initialisation', detail='Test connexion...',
                   producers=0, vintages=0, started_at=datetime.now().isoformat(), error=None)

    ok, working_url, indicators = test_connection()
    if not ok:
        error_msg = "Impossible de se connecter au site Hachette"
        log.error(error_msg)
        conn.execute(
            "UPDATE scrape_log SET status=%s, finished_at=%s, details=%s WHERE id=%s",
            (f'error: {error_msg}', datetime.now().isoformat(), error_msg, log_id)
        )
        conn.commit()
        _push_progress(running=False, error=error_msg, phase='Erreur connexion')
        conn.close()
        return

    try:
        TOTAL_PAGES_MAX = 3294
        total_vintages = 0
        total_producers = 0
        seen_producers: set = set()
        consecutive_empty = 0

        for page in range(1, TOTAL_PAGES_MAX + 1):
            percent = int((page / TOTAL_PAGES_MAX) * 100)

            if page % 10 == 0 or page == 1:
                _push_progress(
                    phase='Scraping pages',
                    detail=f'Page {page}/{TOTAL_PAGES_MAX} — {total_vintages} vins',
                    percent=percent,
                    vintages=total_vintages,
                    producers=total_producers
                )

            url = f"{BASE_URL}/vins/page-{page}/list/?search="
            html = fetch_html(url, delay=1.0)

            if not html:
                log.warning(f"Page {page}: pas de réponse")
                consecutive_empty += 1
                if consecutive_empty >= 3:
                    log.info("  3 pages sans réponse — arrêt")
                    break
                continue

            items = parse_wine_blocks(html)
            log.info(f"Page {page}: {len(items)} vins")

            if not items:
                consecutive_empty += 1
                if consecutive_empty >= 3:
                    log.info("  3 pages vides consécutives — fin pagination")
                    break
                continue

            consecutive_empty = 0

            for item in items:
                code = item.get('producer_code', '')
                if not code:
                    continue

                if code not in seen_producers:
                    seen_producers.add(code)
                    conn.execute(
                        "INSERT INTO producers (code, name, last_scraped) VALUES (%s,%s,%s)"
                        " ON CONFLICT (code) DO NOTHING",
                        (code, item['producer_name'], datetime.now().isoformat())
                    )
                    total_producers += 1

                conn.execute(
                    "INSERT INTO vintages (producer_code, wine_name, year, stars, color, wine_type, link, guide_year)"
                    " VALUES (%s,%s,%s,%s,%s,%s,%s,%s)"
                    " ON CONFLICT (producer_code, wine_name, year, color)"
                    " DO UPDATE SET stars=EXCLUDED.stars, wine_type=EXCLUDED.wine_type, link=EXCLUDED.link, guide_year=EXCLUDED.guide_year",
                    (code, item['name'], item['year'], item['stars'],
                     item['color'], item['wine_type'], item['link'], config.GUIDE_YEAR)
                )
                total_vintages += 1

            if page % 50 == 0:
                conn.commit()
                log.info(f"=== Page {page}: {total_vintages} vins, {total_producers} producteurs ===")

        conn.commit()

        # ── Déduplication couleurs conflictuelles ───────────────────────────
        _push_progress(phase='Déduplication', detail='Correction des couleurs conflictuelles...', percent=99)
        conflicts = conn.execute(
            "SELECT link, STRING_AGG(DISTINCT color, ',') AS colors"
            " FROM vintages WHERE link != ''"
            " GROUP BY link HAVING COUNT(DISTINCT color) > 1"
        ).fetchall()
        dedupe_fixed = 0
        for row in conflicts:
            url = row['link']
            detail = conn.execute("SELECT data::text AS data FROM wine_details WHERE url=%s", (url,)).fetchone()
            correct_color = None
            if detail and detail['data']:
                try:
                    d = json.loads(detail['data'])
                    label = (d.get('wine_type_label') or '').lower()
                    if 'rouge' in label:   correct_color = 'Rouge'
                    elif 'blanc' in label: correct_color = 'Blanc'
                    elif 'ros' in label:   correct_color = 'Rosé'
                except Exception:
                    pass
            if not correct_color:
                maj = conn.execute(
                    "SELECT color, COUNT(*) AS c FROM vintages WHERE link=%s GROUP BY color ORDER BY c DESC LIMIT 1",
                    (url,)
                ).fetchone()
                if maj:
                    correct_color = maj['color']
            if correct_color:
                conn.execute("DELETE FROM vintages WHERE link=%s AND color!=%s", (url, correct_color))
                dedupe_fixed += 1
        conn.commit()
        if dedupe_fixed:
            log.info(f"  Déduplication: {dedupe_fixed} conflits de couleur corrigés")

        no_region = conn.execute(
            "SELECT COUNT(*) AS cnt FROM producers WHERE region IS NULL OR region = ''"
        ).fetchone()['cnt']
        if no_region:
            log.warning(f"  {no_region} producteurs sans région — lancez le backfill régions.")

        # Scraper les détails vins (pages individuelles)
        _push_progress(phase='Scraping détails vins', detail='Récupération des pages détail...', percent=99)
        scraped_details, errors_details = scrape_all_wine_details(conn, limit=None, delay=0.5)
        log.info(f"Détails scrapés: {scraped_details}, erreurs: {errors_details}")

        conn.execute(
            "UPDATE scrape_log SET finished_at=%s, producers_done=%s, vintages_done=%s, status=%s, details=%s WHERE id=%s",
            (datetime.now().isoformat(), total_producers, total_vintages, 'done',
             f'{total_vintages} vins de {total_producers} producteurs + {scraped_details} détails scrapés', log_id)
        )
        conn.commit()

        _push_progress(running=False, percent=100, phase='Terminé',
                       detail=f'{total_vintages} vins de {total_producers} producteurs + {scraped_details} détails',
                       vintages=total_vintages, producers=total_producers)
        log.info(f"=== TERMINÉ: {total_vintages} vins de {total_producers} producteurs + {scraped_details} détails ===")

    except Exception as e:
        log.error(f"Erreur: {e}")
        log.error(traceback.format_exc())
        conn.execute(
            "UPDATE scrape_log SET status=%s, finished_at=%s, details=%s WHERE id=%s",
            (f'error: {e}', datetime.now().isoformat(), str(e), log_id)
        )
        conn.commit()
        _push_progress(running=False, error=str(e), phase='Erreur')
    finally:
        conn.close()


# ==============================================================================
#  SCRAPING PAR ANNÉE
# ==============================================================================
def run_year_scrape(year: int):
    """MàJ par année : scrape tous les vins du millésime donné."""
    conn = get_db()
    c = conn.cursor()

    c.execute(
        "INSERT INTO scrape_log (scrape_type, started_at, status, details)"
        " VALUES (%s,%s,%s,%s) RETURNING id",
        (f'year_{year}', datetime.now().isoformat(), 'running', 'Démarrage...')
    )
    log_id = c.fetchone()['id']
    conn.commit()

    _push_progress(running=True, type=f'year_{year}', percent=0,
                   phase=f'MàJ {year}', detail='Démarrage...',
                   producers=0, vintages=0, started_at=datetime.now().isoformat(), error=None)

    try:
        url_template = f"{BASE_URL}/vins/page-{{page}}/list/?filtre%5Bmillesime%5D={year}&sort%5Bmillesime%5D=desc"
        all_items = []
        seen_codes = set()

        for page in range(1, 200):
            _push_progress(detail=f'Page {page}', percent=min(page, 90))

            html = fetch_html(url_template.format(page=page), delay=1.0)
            if not html:
                log.warning(f"Page {page}: pas de réponse")
                break

            items = parse_wine_blocks(html)
            log.info(f"Page {page}: {len(items)} vins")

            if not items:
                break

            for item in items:
                if item.get('producer_code'):
                    seen_codes.add(item['producer_code'])
            all_items.extend(items)

        log.info(f"=== {len(all_items)} vins pour {year} ===")

        if not all_items:
            error_msg = f"Aucun vin trouvé pour {year}"
            conn.execute(
                "UPDATE scrape_log SET status=%s, finished_at=%s, details=%s WHERE id=%s",
                (f'error: {error_msg}', datetime.now().isoformat(), error_msg, log_id)
            )
            conn.commit()
            _push_progress(running=False, error=error_msg, phase='Erreur')
            conn.close()
            return

        _push_progress(phase=f'Sauvegarde {year}', percent=90,
                       detail=f'{len(all_items)} vins trouvés')

        total_vintages = 0
        for item in all_items:
            code = item.get('producer_code', f'unknown_{normalize(item["name"])[:20]}')
            conn.execute(
                "INSERT INTO producers (code, name, last_scraped) VALUES (%s,%s,%s)"
                " ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, last_scraped=EXCLUDED.last_scraped",
                (code, item.get('producer_name', item['name']), datetime.now().isoformat())
            )
            conn.execute(
                "INSERT INTO vintages (producer_code, wine_name, year, stars, color, wine_type, link, guide_year)"
                " VALUES (%s,%s,%s,%s,%s,%s,%s,%s)"
                " ON CONFLICT (producer_code, wine_name, year, color)"
                " DO UPDATE SET stars=EXCLUDED.stars, wine_type=EXCLUDED.wine_type, link=EXCLUDED.link, guide_year=EXCLUDED.guide_year",
                (code, item['name'], item['year'], item['stars'],
                 item['color'], item['wine_type'], item['link'], config.GUIDE_YEAR)
            )
            total_vintages += 1

        conn.commit()

        # Correction automatique étoiles Guide 2026+
        guide_items = [i for i in all_items if i.get('guide_year') and i.get('stars', 0) == 0]
        if guide_items:
            _push_progress(phase=f'Correction étoiles Guide {year}', percent=95,
                           detail=f'{len(guide_items)} vins Guide à vérifier...')
            guide_fixed = _fix_guide_stars_batch(conn, all_items, year)
            total_guide_fixed = guide_fixed
        else:
            total_guide_fixed = 0

        conn.execute(
            "UPDATE scrape_log SET finished_at=%s, vintages_done=%s, status=%s, details=%s WHERE id=%s",
            (datetime.now().isoformat(), total_vintages, 'done',
             f'{total_vintages} vins {year}' + (f' ({total_guide_fixed} étoiles Guide corrigées)' if total_guide_fixed else ''),
             log_id)
        )
        conn.commit()

        _push_progress(
            running=False, percent=100, phase='Terminé',
            detail=f'{total_vintages} vins {year} ajoutés' + (f' · {total_guide_fixed} étoiles Guide corrigées' if total_guide_fixed else '')
        )
        log.info(f"=== MàJ {year} TERMINÉE: {total_vintages} vins ===")

    except Exception as e:
        log.error(f"Erreur: {e}")
        log.error(traceback.format_exc())
        conn.execute(
            "UPDATE scrape_log SET status=%s, finished_at=%s, details=%s WHERE id=%s",
            (f'error: {e}', datetime.now().isoformat(), str(e), log_id)
        )
        conn.commit()
        _push_progress(running=False, error=str(e), phase='Erreur')
    finally:
        conn.close()


# ==============================================================================
#  SCRAPING DÉTAILS VINS (pages individuelles)
# ==============================================================================
def scrape_all_wine_details(conn, limit: Optional[int] = None, delay: float = 0.5) -> Tuple[int, int]:
    """Scrape les pages détail des vins et sauvegarde en wine_details.

    Récupère toutes les URLs de vintages non encore scrapées, parse les pages
    détails, et sauvegarde les résultats en PostgreSQL table wine_details.

    Args:
        conn: PGConnection instance
        limit: Nombre max de vins à scraper (None = tous)
        delay: Délai entre chaque requête (secondes)

    Returns:
        Tuple (total_scraped, total_errors)
    """
    log.info(f"=== Scraping détails vins (limit={limit}, delay={delay}s) ===")

    # Récupérer les URLs non encore scrapées
    query = """
        SELECT v.id, v.link, v.producer_code, v.wine_name, v.year, v.stars, v.color
        FROM vintages v
        LEFT JOIN wine_details wd ON wd.url = v.link
        WHERE v.link IS NOT NULL AND v.link != ''
          AND wd.url IS NULL
        ORDER BY v.stars DESC
        LIMIT %s
    """
    params = (limit,) if limit else (999999,)
    rows = conn.execute(query, params).fetchall()
    total_rows = len(rows)

    if total_rows == 0:
        log.info("  Aucun nouveau vin à scraper")
        return 0, 0

    log.info(f"  {total_rows} vins à scraper")

    scraped = 0
    errors = 0
    commit_batch = 10

    for i, row in enumerate(rows):
        url = row['link']
        if not url:
            continue

        try:
            # Fetch et parse la page détail
            detail = fetch_wine_detail(url)
            if not detail:
                errors += 1
                log.warning(f"  [{i+1}/{total_rows}] Erreur: {url[:70]}")
                continue

            # Sauvegarder en wine_details (JSONB)
            data_json = json.dumps(detail, ensure_ascii=False)
            conn.execute(
                "INSERT INTO wine_details (url, data, fetched_at)"
                " VALUES (%s, %s::jsonb, NOW())"
                " ON CONFLICT (url) DO UPDATE SET data=%s::jsonb, fetched_at=NOW()",
                (url, data_json, data_json)
            )

            # Mettre à jour stars/color dans vintages si nouvelles infos
            updated_stars = detail.get('stars')
            updated_color = detail.get('color')

            if updated_stars and updated_stars > 0 and row['stars'] == 0:
                conn.execute(
                    "UPDATE vintages SET stars=%s WHERE id=%s",
                    (updated_stars, row['id'])
                )
                log.info(f"  ✓ [{i+1}/{total_rows}] {row['wine_name']} {row['year']}: {updated_stars}★")

            if updated_color and row['color'] == 'Autre':
                conn.execute(
                    "UPDATE vintages SET color=%s WHERE id=%s",
                    (updated_color, row['id'])
                )
                log.info(f"  ✓ [{i+1}/{total_rows}] {row['wine_name']} {row['year']}: {updated_color}")

            scraped += 1

            # Commit par batch
            if (i + 1) % commit_batch == 0:
                conn.commit()
                log.debug(f"    Commit: {i+1}/{total_rows}")

            # Délai entre requêtes
            if i < total_rows - 1:
                time.sleep(delay)

        except Exception as e:
            errors += 1
            log.error(f"  Erreur scraping {url[:70]}: {e}")
            continue

    # Commit final
    conn.commit()
    log.info(f"=== Détails scrapés: {scraped}/{total_rows}, erreurs: {errors} ===")
    return scraped, errors


# ==============================================================================
#  CORRECTION ÉTOILES GUIDE
# ==============================================================================
def run_fix_guide_stars():
    """Correction standalone des étoiles Guide 2026+."""
    conn = get_db()
    current_year = datetime.now().year

    _cur = conn.cursor()
    _cur.execute(
        "INSERT INTO scrape_log (scrape_type, started_at, status, details)"
        " VALUES (%s,%s,%s,%s) RETURNING id",
        ('fix_guide_stars', datetime.now().isoformat(), 'running', 'Recherche vins 0★ Guide...')
    )
    log_id = _cur.fetchone()['id']
    conn.commit()

    _push_progress(running=True, type='fix_guide_stars', percent=0,
                   phase='Correction étoiles Guide', detail='Recherche candidats...',
                   producers=0, vintages=0, started_at=datetime.now().isoformat(), error=None)

    try:
        year_likes = ' OR '.join(
            f"link LIKE '%-{yr}/%'" for yr in range(current_year - 1, current_year + 2)
        )
        candidates = conn.execute(
            f"SELECT id, producer_code, wine_name, year, link FROM vintages "
            f"WHERE stars=0 AND link IS NOT NULL AND link!='' AND ({year_likes})"
        ).fetchall()
        total = len(candidates)

        guide_years_seen = set()
        for row in candidates:
            m = re.search(r'-(\d{4})-(\d{4})/', row['link'] or '')
            if m:
                guide_years_seen.add(int(m.group(2)))

        if guide_years_seen:
            log.info(f"[fix-guide-stars] Guide years détectés dans URLs: {sorted(guide_years_seen)}")
        log.info(f"[fix-guide-stars] {total} candidats (0★ avec lien guide récent)")

        if total == 0:
            _push_progress(running=False, percent=100, phase='Aucun candidat',
                           detail='Aucun vin 0★ avec lien Guide trouvé', vintages=0)
            conn.execute(
                "UPDATE scrape_log SET finished_at=%s, status=%s, details=%s WHERE id=%s",
                (datetime.now().isoformat(), 'done', 'Aucun candidat', log_id)
            )
            conn.commit()
            conn.close()
            return

        fixed = 0
        skipped = 0
        for i, row in enumerate(candidates):
            if i % 5 == 0:
                _push_progress(
                    percent=int((i / total) * 95),
                    detail=f'Vérification {i+1}/{total} — {fixed} corrigés',
                    vintages=fixed
                )
            stars = fetch_detail_stars(row['link'])
            if stars is not None and stars > 0:
                conn.execute("UPDATE vintages SET stars=%s WHERE id=%s", (stars, row['id']))
                fixed += 1
                log.info(f"  ✓ {row['wine_name']} {row['year']}: {stars}★")
                conn.commit()
            else:
                skipped += 1

        conn.execute(
            "UPDATE scrape_log SET finished_at=%s, vintages_done=%s, status=%s, details=%s WHERE id=%s",
            (datetime.now().isoformat(), fixed, 'done',
             f'{fixed}/{total} corrigés ({skipped} sans étoile ou non-trouvés)', log_id)
        )
        conn.commit()

        _push_progress(running=False, percent=100, phase='Terminé',
                       detail=f'{fixed}/{total} vins corrigés', vintages=fixed)
        log.info(f"[fix-guide-stars] Terminé: {fixed}/{total} vins corrigés")

    except Exception as e:
        log.error(f"[fix-guide-stars] Erreur: {e}")
        log.error(traceback.format_exc())
        conn.execute(
            "UPDATE scrape_log SET status=%s, finished_at=%s, details=%s WHERE id=%s",
            (f'error: {e}', datetime.now().isoformat(), str(e), log_id)
        )
        conn.commit()
        _push_progress(running=False, error=str(e), phase='Erreur')
    finally:
        conn.close()


# ==============================================================================
#  ENTRY POINT
# ==============================================================================
if __name__ == '__main__':
    import sys
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    parser = argparse.ArgumentParser(description='Scraper Hachette')
    parser.add_argument('--full', action='store_true', help='Scraping complet')
    parser.add_argument('--year', type=int, help='Scraping pour une année donnée')
    parser.add_argument('--producers', action='store_true', help='Scraping des producteurs')
    parser.add_argument('--backfill-regions', action='store_true', help='Remplir les régions')
    parser.add_argument('--fix-guide-stars', action='store_true', help='Corriger les étoiles Guide')
    parser.add_argument('--guide-year', type=int, default=2026, help='Année du Guide Hachette (défaut: 2026)')

    args = parser.parse_args()

    # Stocker guide_year en variable globale pour les fonctions
    import config as _config
    _config.GUIDE_YEAR = args.guide_year

    if args.full:
        run_full_scrape()
    elif args.year:
        run_year_scrape(args.year)
    elif args.producers:
        run_scrape_producers_all()
    elif args.backfill_regions:
        backfill_producer_regions_from_wines()
    elif args.fix_guide_stars:
        run_fix_guide_stars()
    else:
        # Par défaut, scraping complet
        run_full_scrape()
