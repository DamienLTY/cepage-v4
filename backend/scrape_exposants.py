#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de scraping des exposants d'un salon des Vignerons Independants.

Usage:
    python scrape_exposants.py [OPTIONS]

Options:
    --content-id  ID du salon dans l'API VI (requis si pas deja configure)
    --event-id    Identifiant court du salon, ex: vi-bordeaux-2026
    --location    Ville / salle, ex: "Bordeaux Lac Hall 3"
    --dates       Dates, ex: "13-15 mars 2026"
    --event-name  Nom complet du salon, ex: "Salon VI Bordeaux 2026"
    --output      Chemin de sortie du JSON (optionnel, genere automatiquement)
    --db          Chemin vers wines.db (optionnel)

Exemple:
    python scrape_exposants.py --content-id 297 --event-id vi-bordeaux-2026 ^
        --location "Bordeaux Lac Hall 3" --dates "13-15 mars 2026" ^
        --event-name "Salon des Vignerons Independants - Bordeaux 2026"

Si aucun argument n'est passe, les valeurs par defaut (Bordeaux 2026) sont utilisees.
"""

import json
import requests
import re
import unicodedata
import argparse
from datetime import datetime
from pathlib import Path
from difflib import SequenceMatcher
from collections import defaultdict
import sys

from db_pg import get_db

# Valeurs par defaut (dernier salon configure)
DEFAULT_CONTENT_ID = 297
DEFAULT_EVENT_ID = "vi-bordeaux-2026"
DEFAULT_EVENT_NAME = "Salon des Vignerons Independants - Bordeaux 2026"
DEFAULT_LOCATION = "Bordeaux Lac Hall 3"
DEFAULT_DATES = "13-15 mars 2026"
DEFAULT_DB_PATH = "C:/Users/damie/CLAUDE CODE/CEPAGE V4/3. SITE WEB HACHETTE V4/wines.db"
DEFAULT_PUBLIC_DIR = "C:/Users/damie/CLAUDE CODE/CEPAGE V4/3. SITE WEB HACHETTE V4/ESSAIS SITE/public"

API_URL = "https://www.vignerons-independants.com/api/pager/fair_winemakers_list"

def parse_args():
    parser = argparse.ArgumentParser(description="Scrape exposants salon VI + matching Hachette")
    parser.add_argument('--content-id', type=int, default=DEFAULT_CONTENT_ID,
                        help=f"ID du salon dans l'API VI (defaut: {DEFAULT_CONTENT_ID})")
    parser.add_argument('--event-id', default=DEFAULT_EVENT_ID,
                        help=f"Identifiant court ex: vi-bordeaux-2026 (defaut: {DEFAULT_EVENT_ID})")
    parser.add_argument('--event-name', default=DEFAULT_EVENT_NAME,
                        help="Nom complet du salon")
    parser.add_argument('--location', default=DEFAULT_LOCATION,
                        help="Lieu du salon")
    parser.add_argument('--dates', default=DEFAULT_DATES,
                        help="Dates du salon ex: 13-15 mars 2026")
    parser.add_argument('--output', default=None,
                        help="Chemin de sortie JSON (genere auto si absent)")
    parser.add_argument('--db', default=DEFAULT_DB_PATH,
                        help="Chemin vers wines.db")
    return parser.parse_args()

# Parse args au niveau module pour pouvoir utiliser dans les fonctions
_ARGS = parse_args()
DB_PATH = _ARGS.db
OUTPUT_PATH = _ARGS.output or str(Path(DEFAULT_PUBLIC_DIR) / f"exposants-{_ARGS.event_id}.json")
PARAMS = {
    "fair_winemakers_list[ctx][contentId]": _ARGS.content_id,
    "fair_winemakers_list[limit]": 500
}

def normalize_string(text):
    """Normalise une chaine : minuscules, accents supprimes"""
    if not text:
        return ""
    text = text.lower()
    text = ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )
    stop_words = ['chateau', 'domaine', 'et', 'de', 'la', 'le', 'les', 'du', 'des', 'sarl', 'sas', 'eurl', 'sa']
    words = text.split()
    words = [w for w in words if w not in stop_words and len(w) > 1]
    return ' '.join(words)

def similarity_ratio(a, b):
    """Calcule le ratio de similarite"""
    return SequenceMatcher(None, a, b).ratio()

def fetch_exposants():
    """Recupere la liste des exposants"""
    print("[1/5] Recuperation des exposants...")
    try:
        response = requests.get(API_URL, params=PARAMS, timeout=15)
        response.raise_for_status()
        data = response.json()

        exposants = []
        if 'items' in data:
            for item in data['items']:
                fields = item.get('fields', {})
                exposant = {
                    'name': fields.get('name_s', ''),
                    'stand': fields.get('stand_s', ''),
                    'viPath': fields.get('url_s', ''),
                    'viRegion': fields.get('wine_region_s', ''),
                }
                if exposant['name']:
                    exposants.append(exposant)

        print(f"     -> {len(exposants)} exposants recuperes")
        return exposants
    except Exception as e:
        print(f"     [ERREUR] {e}")
        return []

def sort_stands(exposants):
    """Trie les exposants par numero de stand"""
    def stand_key(e):
        stand = e.get('stand', '')
        match = re.match(r'([A-Z]+)\s*(\d+)', stand)
        if match:
            return (match.group(1), int(match.group(2)))
        return (stand, 0)

    return sorted(exposants, key=stand_key)

def search_producer_in_db(conn, exposant_name):
    """Recherche un producteur dans la BDD"""
    cursor = conn.cursor()
    normalized_search = normalize_string(exposant_name)

    if not normalized_search:
        return None

    search_words = normalized_search.split()
    cursor.execute("SELECT code, name, region FROM producers")
    all_producers = cursor.fetchall()
    candidates = []

    for row in all_producers:
        producer_code = row['code']
        producer_name = row['name']
        region = row['region']
        normalized_producer = normalize_string(producer_name)
        words_found = sum(1 for word in search_words if word in normalized_producer)

        if words_found > 0:
            similarity = similarity_ratio(normalized_search, normalized_producer)
            score = words_found + (similarity * 0.5)
            candidates.append({
                'code': producer_code,
                'name': producer_name,
                'region': region,
                'score': score
            })

    if candidates:
        candidates.sort(key=lambda x: x['score'], reverse=True)
        return candidates[0]

    return None

def get_wines_for_producer(conn, producer_code):
    """Recupere tous les vins d'un producteur.
    Gere le cas ou le code est numerique (producers table) mais les
    millesimes utilisent un slug (vintages table) - tente plusieurs variantes.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT wine_name, year, stars, color, wine_type, link
        FROM vintages
        WHERE producer_code = %s
        ORDER BY wine_name, year DESC
    """, (producer_code,))
    rows = cursor.fetchall()

    # Si pas de resultat et code numerique -> essayer le slug de producer_url
    if not rows and str(producer_code).isdigit():
        cursor.execute("SELECT producer_url FROM producers WHERE code=%s", (producer_code,))
        row = cursor.fetchone()
        if row and row.get('producer_url'):
            # Extraire le slug depuis l'URL
            parts = [p for p in row['producer_url'].split('/') if p]
            url_slug = parts[-1] if parts else ''
            if url_slug:
                cursor.execute("""
                    SELECT wine_name, year, stars, color, wine_type, link
                    FROM vintages WHERE producer_code = %s
                    ORDER BY wine_name, year DESC
                """, (url_slug,))
                rows = cursor.fetchall()
                if not rows:
                    words = url_slug.split('-')
                    if len(words) > 2:
                        short_slug = '-'.join(words[1:])
                        cursor.execute("""
                            SELECT wine_name, year, stars, color, wine_type, link
                            FROM vintages WHERE producer_code = %s
                            ORDER BY wine_name, year DESC
                        """, (short_slug,))
                        rows = cursor.fetchall()
                        if not rows:
                            short_slug2 = '-'.join(words[2:]) if len(words) > 3 else ''
                            if short_slug2:
                                cursor.execute("""
                                    SELECT wine_name, year, stars, color, wine_type, link
                                    FROM vintages WHERE producer_code = %s
                                    ORDER BY wine_name, year DESC
                                """, (short_slug2,))
                                rows = cursor.fetchall()

    wines_by_name = defaultdict(list)

    for r in rows:
        wine_name = r['wine_name']
        year = r['year']
        stars = r['stars']
        color = r['color']
        wine_type = r['wine_type']
        link = r['link']
        wines_by_name[wine_name].append({
            'year': year,
            'stars': stars,
            'name': wine_name,
            'color': color,
            'type': wine_type,
            'link': link,
            'isEffervescent': wine_type and 'effervescent' in wine_type.lower()
        })

    wine_results = []
    for wine_name, vintages in wines_by_name.items():
        wine_results.append({
            'searchName': wine_name,
            'foundName': wine_name,
            'producerCode': producer_code,
            'producerName': '',
            'concordance': 85,
            'passUsed': 'db-producer',
            'detailUrl': '',
            'vintages': vintages
        })

    return wine_results

def process_exposants(exposants):
    """Traite les exposants et les matche avec la BDD"""
    print("[2/5] Tri des exposants...")
    exposants = sort_stands(exposants)
    print(f"     -> Premiers stands: {[e['stand'] for e in exposants[:5]]}")

    print("[3/5] Matching avec la BDD...")
    conn = get_db()
    results = []
    matches_found = 0
    no_matches = 0

    for i, exposant in enumerate(exposants):
        if (i + 1) % 50 == 0:
            print(f"     -> Progression: {i+1}/{len(exposants)}")

        match = search_producer_in_db(conn, exposant['name'])

        result = {
            'stand': exposant['stand'],
            'name': exposant['name'],
            'viPath': exposant['viPath'],
            'region': exposant.get('viRegion', ''),
            'hasDbMatch': False,
            'producerCode': '',
            'producerNameDb': '',
            'wineResults': []
        }

        if match:
            result['hasDbMatch'] = True
            result['region'] = match['region'] or exposant.get('viRegion', '')
            result['producerCode'] = match['code']
            result['producerNameDb'] = match['name']

            wines = get_wines_for_producer(conn, match['code'])
            for wine in wines:
                wine['producerName'] = match['name']

            result['wineResults'] = wines
            matches_found += 1
        else:
            no_matches += 1

        results.append(result)

    conn.close()
    print(f"     -> Matching termine: {matches_found} avec match, {no_matches} sans match")

    return results, matches_found, no_matches

def save_results(exposants, matches_found, no_matches):
    """Sauvegarde les resultats"""
    print("[4/5] Creation du fichier JSON...")

    output = {
        'eventId': _ARGS.event_id,
        'eventName': _ARGS.event_name,
        'location': _ARGS.location,
        'dates': _ARGS.dates,
        'generatedAt': datetime.now().isoformat().split('.')[0],
        'totalExposants': len(exposants),
        'matchesFound': matches_found,
        'noMatches': no_matches,
        'exposants': exposants
    }

    output_path = Path(OUTPUT_PATH)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    file_size = output_path.stat().st_size
    print(f"     -> Fichier cree: {output_path}")
    print(f"     -> Taille: {file_size/1024:.1f} KB")

def main():
    """Fonction principale"""
    print("=" * 70)
    print(f"SCRAPING EXPOSANTS - {_ARGS.event_name.upper()}")
    print("=" * 70)
    print(f"  Event ID   : {_ARGS.event_id}")
    print(f"  Content ID : {_ARGS.content_id}")
    print(f"  Lieu       : {_ARGS.location}")
    print(f"  Dates      : {_ARGS.dates}")
    print(f"  Sortie     : {OUTPUT_PATH}")
    print(f"  BDD        : {DB_PATH}")
    print("=" * 70)
    print()

    exposants = fetch_exposants()
    if not exposants:
        print("[ERREUR] Aucun exposant recupere")
        return

    results, matches_found, no_matches = process_exposants(exposants)
    save_results(results, matches_found, no_matches)

    print("[5/5] Resume final")
    print("=" * 70)
    print(f"Total exposants: {len(results)}")
    print(f"Avec match BDD:  {matches_found} ({100*matches_found//len(results)}%)")
    print(f"Sans match BDD:  {no_matches} ({100*no_matches//len(results)}%)")
    print()
    print("Exemples avec match:")
    for e in results[:5]:
        if e['hasDbMatch']:
            wines_count = sum(len(w['vintages']) for w in e['wineResults'])
            print(f"  - Stand {e['stand']}: {e['name']}")
            print(f"    => {e['producerNameDb']} ({wines_count} millesimes)")

    print()
    print("Exemples sans match:")
    count = 0
    for e in results:
        if not e['hasDbMatch'] and count < 3:
            print(f"  - Stand {e['stand']}: {e['name']}")
            count += 1

    print()
    print("=" * 70)
    print("Script termine avec succes")
    print("=" * 70)

if __name__ == '__main__':
    main()
