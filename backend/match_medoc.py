#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
match_medoc.py — Post-matching BDD pour les exposants Portes Ouvertes Médoc

Lit exposants-po-medoc-2026.json, fait le matching avec wines.db,
et met à jour le fichier avec les wineResults trouvés.

Usage :
    python match_medoc.py
    python match_medoc.py --db "chemin/vers/wines.db"
    python match_medoc.py --dry-run  (affiche sans écrire)
"""

import argparse
import io
import json
import re
import sys
import unicodedata
from pathlib import Path

from db_pg import get_db

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

DEFAULT_DB = "C:/Users/damie/CLAUDE CODE/CEPAGE V4/3. SITE WEB HACHETTE V4/wines.db"
JSON_PATH  = Path(__file__).parent / "ESSAIS SITE/public/exposants-po-medoc-2026.json"


def normalize_string(s: str) -> str:
    if not s:
        return ''
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", ' ', s)
    s = re.sub(r'\b(chateau|domaine|mas|cave|clos|les|le|la|de|du|des|et|en)\b', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def similarity_ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    set_a, set_b = set(a.split()), set(b.split())
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union else 0.0


BORDEAUX_KEYWORDS = ['bordeaux', 'medoc', 'médoc', 'gironde', 'haut-medoc', 'haut-médoc',
                     'pauillac', 'margaux', 'saint-julien', 'saint-estephe', 'saint-émilion',
                     'listrac', 'moulis', 'graves', 'sauternes', 'pessac', 'fronsac', 'pomerol']


def is_bordeaux_region(region: str | None) -> bool:
    if not region:
        return True  # région inconnue : on accepte par défaut
    r = region.lower()
    return any(k in r for k in BORDEAUX_KEYWORDS) or 'bordeaux' in r


def search_producer_in_db(conn, name: str):
    cursor = conn.cursor()
    normalized = normalize_string(name)
    if not normalized:
        return None
    words = [w for w in normalized.split() if len(w) > 2]
    if not words:
        return None
    cursor.execute("SELECT code, name, region FROM producers")
    candidates = []
    for row in cursor.fetchall():
        code = row['code']
        prod_name = row['name']
        region = row['region']
        # Filtre région : les portes ouvertes du Médoc ne concernent que Bordeaux
        if not is_bordeaux_region(region):
            continue
        norm_prod = normalize_string(prod_name)
        words_found = sum(1 for w in words if w in norm_prod)
        if words_found > 0:
            sim = similarity_ratio(normalized, norm_prod)
            score = words_found + (sim * 0.5)
            candidates.append({'code': code, 'name': prod_name, 'region': region, 'score': score})
    if not candidates:
        return None
    candidates.sort(key=lambda x: x['score'], reverse=True)
    best = candidates[0]
    # Seuil minimum : au moins 1 mot significatif ET score suffisant
    if best['score'] < 1.2:
        return None
    return best


def get_wines_for_producer(conn, producer_code, producer_name=''):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT wine_name, year, stars, color, wine_type, link
        FROM vintages WHERE producer_code = %s
        ORDER BY wine_name, year DESC
    """, (producer_code,))
    rows = cursor.fetchall()

    if not rows and str(producer_code).isdigit():
        cursor.execute("SELECT producer_url FROM producers WHERE code=%s", (producer_code,))
        row = cursor.fetchone()
        if row and row.get('producer_url'):
            parts = [p for p in row['producer_url'].split('/') if p]
            slug = parts[-1] if parts else ''
            if slug:
                cursor.execute("""
                    SELECT wine_name, year, stars, color, wine_type, link
                    FROM vintages WHERE producer_code = %s
                    ORDER BY wine_name, year DESC
                """, (slug,))
                rows = cursor.fetchall()

    # Grouper par nom de vin — format WineResult attendu par le composant React
    wines = {}
    for r in rows:
        wine_name = r['wine_name']
        year = r['year']
        stars = r['stars']
        color = r['color']
        wine_type = r['wine_type']
        link = r['link']
        if wine_name not in wines:
            is_eff = bool(wine_type and 'effervescent' in wine_type.lower())
            wines[wine_name] = {
                'searchName': wine_name,
                'foundName': wine_name,
                'producerCode': str(producer_code),
                'producerName': producer_name,
                'concordance': 85,
                'passUsed': 'db-producer',
                'detailUrl': '',
                'vintages': []
            }
        is_eff = bool(wine_type and 'effervescent' in wine_type.lower())
        wines[wine_name]['vintages'].append({
            'year': year or 0,
            'stars': stars or 0,
            'name': wine_name,
            'color': color or '',
            'type': wine_type or '',
            'link': link or '',
            'isEffervescent': is_eff
        })
    return list(wines.values())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', default=DEFAULT_DB)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    if not JSON_PATH.exists():
        print(f"ERREUR : JSON introuvable : {JSON_PATH}")
        sys.exit(1)

    with open(JSON_PATH, encoding='utf-8') as f:
        data = json.load(f)

    exposants = data.get('exposants', [])
    print(f"Chargé {len(exposants)} exposants depuis {JSON_PATH.name}")

    conn = get_db()
    matches = 0
    no_match = 0

    for exp in exposants:
        name = exp.get('name', '')
        match = search_producer_in_db(conn, name)
        if match:
            wines = get_wines_for_producer(conn, match['code'], match['name'])
            exp['hasDbMatch'] = True
            exp['producerCode'] = match['code']
            exp['producerNameDb'] = match['name']
            exp['wineResults'] = wines
            if not exp.get('region') or exp['region'] == 'Bordeaux · Médoc':
                if match['region']:
                    exp['region'] = match['region']
            matches += 1
            wines_count = sum(len(w['vintages']) for w in wines)
            print(f"  ✓ {name} → {match['name']} ({wines_count} millésimes)")
        else:
            exp['hasDbMatch'] = False
            exp['producerCode'] = ''
            exp['producerNameDb'] = ''
            exp['wineResults'] = []
            no_match += 1

    conn.close()

    data['matchesFound'] = matches
    data['noMatches'] = no_match

    print(f"\nRésultat : {matches} matchés / {no_match} sans match ({len(exposants)} total)")

    if args.dry_run:
        print("[dry-run] Fichier non écrit.")
    else:
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Fichier mis à jour : {JSON_PATH}")


if __name__ == '__main__':
    main()
