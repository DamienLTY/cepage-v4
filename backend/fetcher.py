#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetcher.py — Récupération HTTP et parsing HTML des pages Hachette
"""

import re
import time
import logging
from datetime import datetime
from typing import Optional, List, Dict

from bs4 import BeautifulSoup

from config import BASE_URL, ANNEE_MIN, SCRAPLING_OK, FETCHER, SESSION
from db_pg import normalize

log = logging.getLogger("backend")


# ==============================================================================
#  FETCH HTML
# ==============================================================================
def fetch_html(url: str, delay: float = 1.0) -> Optional[str]:
    """Récupère le HTML d'une URL (Scrapling en priorité, puis requests)."""
    time.sleep(delay)
    log.debug(f"Fetch: {url[:100]}...")

    if SCRAPLING_OK and FETCHER:
        try:
            # API v0.4+ : classmethod .fetch() avec options furtivité + perf
            page = FETCHER.fetch(
                url,
                headless=True,
                network_idle=True,
                disable_resources=True,  # ignore fonts/images/media → +rapide
                google_search=True,      # referer Google → moins suspect
            )
            if page and page.status == 200:
                log.debug(f"  Scrapling OK: {len(page.html_content)} chars")
                return page.html_content
        except Exception as e:
            log.debug(f"  Scrapling erreur: {e}")

    if SESSION:
        try:
            r = SESSION.get(url, timeout=20, verify=False)
            log.debug(f"  Requests: HTTP {r.status_code}, {len(r.text)} chars")
            if r.ok and len(r.text) > 500:
                return r.text
        except Exception as e:
            log.debug(f"  Requests erreur: {e}")

    return None


# ==============================================================================
#  TEST CONNEXION
# ==============================================================================
def test_connection():
    """Teste la connexion au site Hachette."""
    log.info("Test connexion au site Hachette...")

    urls_to_test = [
        BASE_URL + "/",
        BASE_URL + "/vins/",
        BASE_URL + "/guide-des-vins/",
    ]

    for url in urls_to_test:
        html = fetch_html(url, delay=0.5)
        if html and len(html) > 1000:
            log.info(f"  Connexion OK via {url}")
            log.info(f"  HTML reçu: {len(html)} caractères")

            soup = BeautifulSoup(html, 'html.parser')
            indicators = {
                'custom-block':     len(soup.select('.block.custom-block')),
                'wine-item':        len(soup.select('.wine-item')),
                'product-item':     len(soup.select('.product-item')),
                'cards':            len(soup.select('.card')),
                'links_vins':       len(soup.select('a[href*="/vins/"]')),
                'links_producteur': html.count('code_producteur'),
            }
            log.info(f"  Indicateurs: {indicators}")
            return True, url, indicators

    log.error("  Aucune URL ne répond correctement")
    return False, None, {}


# ==============================================================================
#  PARSER HTML — BLOCS VIN
# ==============================================================================
def parse_wine_blocks(html: str) -> List[Dict]:
    """Parse les blocs vin depuis /vins/page-N/list/?search=

    Structure HTML :
      .block.custom-block
        span[itemprop=name]          → nom producteur
        .title .sub-title            → "Nom du vin 2023"
        .rating span.active          → étoiles (compter)
        a[itemprop=url]              → lien fiche
        texte brut                   → "Rouge/Blanc/Rosé tranquille"
    """
    if not html or len(html) < 500:
        return []

    soup = BeautifulSoup(html, 'html.parser')
    items = []
    annee_max = datetime.now().year + 2

    blocks = soup.select('.block.custom-block')
    log.debug(f"  Blocs .block.custom-block: {len(blocks)}")

    for block in blocks:
        try:
            # ── Producteur ────────────────────────────────────────────
            name_el = block.select_one('span[itemprop="name"]')
            if not name_el:
                continue
            producer_name = name_el.get_text().strip()
            if not producer_name or len(producer_name) < 2:
                continue

            # ── Sous-titre = "Nom vin Année" ──────────────────────────
            title_div = block.select_one('.title')
            sub_el = title_div.select_one('.sub-title') if title_div else None
            if not sub_el:
                sub_el = block.select_one('.sub-title')
            sub_text = sub_el.get_text().strip() if sub_el else ''

            # ── Année ──────────────────────────────────────────────────
            year_m = re.search(r'\b((?:19|20)\d{2})\b', sub_text)
            if not year_m:
                year_m = re.search(r'\b((?:19|20)\d{2})\b', block.get_text())
            if not year_m:
                continue
            year = int(year_m.group(1))
            if year < ANNEE_MIN or year > annee_max:
                continue

            # ── Nom du vin = sous-titre sans l'année ───────────────────
            wine_name = re.sub(r'\b(?:19|20)\d{2}\b', '', sub_text).strip()
            if not wine_name:
                wine_name = producer_name

            # ── Étoiles ────────────────────────────────────────────────
            rating_el = block.select_one('.rating')
            stars = len(rating_el.select('span.active')) if rating_el else 0

            # ── Lien ───────────────────────────────────────────────────
            link_el = block.select_one('a[itemprop="url"]') or block.select_one('a[href]')
            link = ''
            if link_el:
                href = link_el.get('href', '')
                link = (BASE_URL + href) if href.startswith('/') else href

            # ── Couleur depuis div.note (source authoritative Hachette) ─
            note_el = block.select_one('.note')
            note_text = note_el.get_text(' ', strip=True) if note_el else ''
            if not note_text:
                img_el = block.select_one('img[src]')
                src = img_el.get('src', '') if img_el else ''
                if 'rouge' in src:   note_text = 'rouge tranquille'
                elif 'blanc' in src: note_text = 'blanc tranquille'
                elif 'ros' in src:   note_text = 'rosé tranquille'

            eff_m = re.search(r'\b(Rouge|Blanc|Ros[ée])\s+effervescent', note_text, re.I)
            col_m = re.search(r'\b(Rouge|Blanc|Ros[ée])\b', note_text, re.I)

            if eff_m:
                wine_type = eff_m.group(1).capitalize() + ' effervescent'
            elif col_m:
                wine_type = col_m.group(1).capitalize() + ' tranquille'
            else:
                wine_type = 'Non specifie'

            tl = wine_type.lower()
            if 'rouge' in tl:   color = 'Rouge'
            elif 'blanc' in tl: color = 'Blanc'
            elif 'ros' in tl:   color = 'Rosé'
            else:               color = 'Autre'

            # ── Code producteur ────────────────────────────────────────
            prod_code = re.sub(r'[^a-z0-9]+', '-', normalize(producer_name))[:50].strip('-')

            # ── Guide year (étoiles masquées en liste) ─────────────────
            guide_m = re.search(r'\bGuide\s+(\d{4})\b', block.get_text(), re.I)
            guide_year = int(guide_m.group(1)) if guide_m else None

            items.append({
                'name':          wine_name,
                'producer_name': producer_name,
                'year':          year,
                'stars':         min(stars, 3),
                'color':         color,
                'wine_type':     wine_type,
                'link':          link,
                'producer_code': prod_code,
                'guide_year':    guide_year,
            })
        except Exception as e:
            log.debug(f"  Erreur parsing bloc: {e}")
            continue

    log.debug(f"  {len(items)} vins extraits")
    return items


# ==============================================================================
#  ÉTOILES GUIDE 2026+ — PAGE DÉTAIL
# ==============================================================================
def fetch_detail_stars(url: str) -> Optional[int]:
    """Récupère les étoiles depuis la page détail Hachette.
    Pour les vins Guide 2026+ dont les étoiles sont masquées sur la liste.
    """
    html = fetch_html(url, delay=0.5)
    if not html:
        return None
    m = re.search(
        r'obtenu la note de\s*<strong>\s*(\d+|une|deux|trois)\s*étoile',
        html, re.I
    )
    if m:
        v = m.group(1).lower().strip()
        mapping = {'une': 1, '1': 1, 'deux': 2, '2': 2, 'trois': 3, '3': 3}
        return mapping.get(v)
    return None


def _fix_guide_stars_batch(conn, items: List[Dict], year: int) -> int:
    """Après scraping d'une année, corrige les 0★ des vins Guide via leur page détail."""
    candidates = [
        item for item in items
        if item.get('stars', 0) == 0
        and item.get('guide_year') is not None
        and item.get('link', '')
    ]
    if not candidates:
        return 0

    log.info(f"  [guide-fix] {len(candidates)} vins 0★ Guide {year} à vérifier...")
    fixed = 0
    for item in candidates:
        stars = fetch_detail_stars(item['link'])
        if stars is not None and stars > 0:
            item['stars'] = stars
            conn.execute(
                "UPDATE vintages SET stars=%s WHERE producer_code=%s AND wine_name=%s AND year=%s",
                (stars, item['producer_code'], item['name'], item['year'])
            )
            fixed += 1
            log.info(f"    ✓ {item['name']} {item['year']}: {stars}★ (Guide {item['guide_year']})")
    conn.commit()
    log.info(f"  [guide-fix] {fixed}/{len(candidates)} vins corrigés")
    return fixed


# ==============================================================================
#  CODES PRODUCTEURS (depuis HTML brut)
# ==============================================================================
def extract_all_producer_codes(html: str) -> List[str]:
    """Extrait les codes producteurs numériques depuis le HTML."""
    if not html:
        return []

    codes = []
    seen = set()

    for m in re.finditer(r'code_producteur[=/](\d+)', html):
        c = m.group(1)
        if c not in seen:
            seen.add(c)
            codes.append(c)

    soup = BeautifulSoup(html, 'html.parser')
    for a in soup.select('a[href*="code_producteur"]'):
        href = a.get('href', '')
        m = re.search(r'code_producteur[=/](\d+)', href)
        if m:
            c = m.group(1)
            if c not in seen:
                seen.add(c)
                codes.append(c)

    log.debug(f"  {len(codes)} codes producteurs")
    return codes


# ==============================================================================
#  SCRAPING PAGE DÉTAIL VIN
# ==============================================================================
def parse_wine_detail_html(html: str) -> Dict:
    """Parse une page détail vin Hachette et extrait les informations.

    Retourne un dictionnaire avec :
    - appellation, region, stars, coup_de_coeur
    - a_boire, garde, temperature, elevage, image, color
    Valeurs None si non trouvées.
    """
    if not html or len(html) < 500:
        return {}

    soup = BeautifulSoup(html, 'html.parser')
    full_text = soup.get_text()

    result = {}

    # ── Région et Appellation (liens dans .location) ────────────────────
    location_links = soup.select('div.detail-product .location a')
    result['region'] = location_links[0].get_text().strip() if len(location_links) > 0 else None
    result['appellation'] = location_links[1].get_text().strip() if len(location_links) > 1 else None

    # ── Étoiles : regex "obtenu la note de X étoile" ───────────────────
    stars = 0
    stars_m = re.search(r'obtenu la note de\s+(\w+)\s+étoile', full_text, re.I)
    if stars_m:
        word = stars_m.group(1).lower().strip()
        mapping = {'une': 1, '1': 1, 'deux': 2, '2': 2, 'trois': 3, '3': 3}
        stars = mapping.get(word, 0)
    result['stars'] = stars if stars > 0 else None

    # ── Coup de Cœur ────────────────────────────────────────────────────
    result['coup_de_coeur'] = bool(re.search(r'Coup de C.?ur', full_text, re.I))

    # ── À boire (texte du lien .boire ou regex) ────────────────────────
    boire_el = soup.select_one('div.detail-product .buttons-func a.boire')
    result['a_boire'] = boire_el.get_text().strip() if boire_el else None

    # ── Garde : regex "entre YYYY-YYYY" ──────────────────────────────────
    garde_m = re.search(r'entre\s+(\d{4})\s*[-–]\s*(\d{4})', full_text)
    if garde_m:
        result['garde'] = f"{garde_m.group(1)}-{garde_m.group(2)}"
    else:
        result['garde'] = None

    # ── Température : regex "NN à NN °C" ─────────────────────────────────
    temp_m = re.search(r'(\d+)\s*(?:à|et)\s*(\d+)\s*°C', full_text, re.I)
    if temp_m:
        result['temperature'] = f"{temp_m.group(1)}-{temp_m.group(2)}°C"
    else:
        result['temperature'] = None

    # ── Élevage : regex "est élevé(e) .+?[\.\n]" ───────────────────────
    elevage_m = re.search(r'est élevé(?:e)?\s+(.+?)[.\n]', full_text, re.I)
    if elevage_m:
        result['elevage'] = elevage_m.group(1).strip()
    else:
        result['elevage'] = None

    # ── Image : premier <img> avec src non vide ──────────────────────────
    img_el = soup.select_one('div.detail-product img')
    result['image'] = img_el.get('src', '').strip() if img_el else None

    # ── Couleur : déduit du type de vin (.wine-type-label) ──────────────
    wine_type_el = soup.select_one('div.detail-product .buttons-func a.banc')
    wine_type_label = wine_type_el.get_text().strip().lower() if wine_type_el else ''

    if 'rouge' in wine_type_label:
        result['color'] = 'Rouge'
    elif 'blanc' in wine_type_label:
        result['color'] = 'Blanc'
    elif 'ros' in wine_type_label:
        result['color'] = 'Rosé'
    else:
        result['color'] = None

    return result


def fetch_wine_detail(url: str, session=None) -> Optional[Dict]:
    """Récupère et parse une page détail de vin Hachette.

    Args:
        url: URL complète de la page détail (ex: https://www.hachette-vins.com/vins/...)
        session: Optional requests.Session pour réutiliser la connexion

    Returns:
        Dict avec les champs extraits {appellation, region, stars, ...}
        ou None si le HTML n'a pu être récupéré.
    """
    html = fetch_html(url, delay=0.5)
    if not html:
        log.warning(f"  Impossible de récupérer: {url[:80]}")
        return None

    try:
        detail = parse_wine_detail_html(html)
        if detail:
            log.debug(f"  ✓ {url[:80]}: {detail.get('stars')}★ {detail.get('color')}")
        return detail
    except Exception as e:
        log.warning(f"  Erreur parsing {url[:80]}: {e}")
        return None
