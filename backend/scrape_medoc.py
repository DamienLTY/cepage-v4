#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scrape_medoc.py — Scrape les châteaux des Portes Ouvertes du Médoc

Source liste : https://portesouvertesenmedoc.fr/printemps-des-chateaux-tous-les-domaines/
Source event : https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-chateaux-du-medoc.html

Usage :
    python scrape_medoc.py [--event-id po-medoc-2026] [--output ESSAIS SITE/public/]
    python scrape_medoc.py --event-id po-medoc-2026 --dates "28 & 29 mars 2026"
"""

import argparse
import io
import json
import re
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

# Forcer UTF-8 sur stdout (Windows)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

LIST_URL  = 'https://portesouvertesenmedoc.fr/printemps-des-chateaux-tous-les-domaines/'
EVENT_URL = 'https://www.bordeaux-tourisme.com/evenements/portes-ouvertes-chateaux-du-medoc.html'
BASE_URL  = 'https://portesouvertesenmedoc.fr'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9',
}


# ── Utilitaires HTTP ────────────────────────────────────────────────────────────

def fetch_html(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    return urllib.request.urlopen(req, timeout=timeout).read().decode('utf-8', errors='replace')


def clean_text(text: str) -> str:
    """Supprime les balises HTML et nettoie les espaces."""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&#039;', "'", text)
    text = re.sub(r'&[a-z]+;', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


# ── Extraction page liste ────────────────────────────────────────────────────────

def get_chateau_urls(html: str) -> list[str]:
    """Extrait les URLs individuelles des châteaux depuis la page liste."""
    urls = re.findall(
        r'href="(https?://portesouvertesenmedoc\.fr/[^"?#]+/)"',
        html
    )
    # Exclure les pages non-châteaux
    exclude_patterns = [
        'printemps-des-chateaux', 'portes-ouvertes', 'contact', 'mentions',
        'politique', 'plan-du-site', 'partenaires', 'week-end', 'accueil',
        'avec-les', 'visit', 'wp-', 'feed', 'laccueil', 'page', 'crus-artisans',
        'bienvenue', 'partenaires', 'printemps', 'portesouvertesenmedoc.fr/',
    ]
    seen = set()
    result = []
    for url in urls:
        path = url.rstrip('/').split('/')[-1]
        if any(pat in path for pat in exclude_patterns):
            continue
        if url not in seen and url != BASE_URL + '/':
            seen.add(url)
            result.append(url)
    return result


# ── Extraction page château individuel ─────────────────────────────────────────

def extract_section_content(paras: list[str], label_pattern: str) -> str:
    """
    Cherche un paragraphe-étiquette (court, < 80 chars) correspondant à label_pattern,
    retourne le contenu du paragraphe SUIVANT.
    """
    for i, p in enumerate(paras):
        # Le label doit être un court paragraphe (< 80 chars) pour éviter les faux positifs
        if len(p) < 80 and re.search(label_pattern, p, re.IGNORECASE):
            if i + 1 < len(paras):
                return paras[i + 1].strip()
    return ''


def extract_chateau_page(url: str) -> dict:
    """Extrait les données d'une page château individuelle."""
    try:
        html = fetch_html(url)
    except Exception as e:
        print(f"    ⚠ Erreur fetch {url}: {e}", file=sys.stderr)
        return {}

    # Supprimer les styles et scripts
    clean = re.sub(r'<style[^>]*>.*?</style>', ' ', html, flags=re.DOTALL)
    clean = re.sub(r'<script[^>]*>.*?</script>', ' ', clean, flags=re.DOTALL)

    # Nom : h1
    h1_match = re.findall(r'<h1[^>]*>(.*?)</h1>', clean, re.DOTALL)
    name = clean_text(h1_match[0]) if h1_match else ''
    if not name:
        # Fallback : og:title
        og = re.search(r'<meta property="og:title" content="([^"]+)"', html)
        name = og.group(1).strip() if og else url.rstrip('/').split('/')[-1].replace('-', ' ').title()

    # Image : og:image
    og_img = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    image = og_img.group(1) if og_img else ''

    # Extraire les paragraphes (texte visible)
    raw_paras = re.findall(r'<p[^>]*>(.*?)</p>', clean, re.DOTALL)
    paras = [clean_text(p) for p in raw_paras]
    paras = [p for p in paras if len(p) > 2]

    # Appellation (chercher "APPELLATION")
    appellation = extract_section_content(paras, r'APPELLATION')
    # Souvent "Margaux / Haut-Médoc" → garder la première partie
    if '/' in appellation:
        appellation = appellation.split('/')[0].strip()

    # Horaires (chercher "OUVERTURE")
    ouverture = extract_section_content(paras, r'OUVERTURE')

    # Conditions de visite
    conditions = extract_section_content(paras, r'CONDITIONS\s+DE\s+VISITE')

    # Vins à la dégustation
    vins_degustation = extract_section_content(paras, r'VINS\s+[AG]?\s*LA\s+D[EÉ]GUSTATION')

    # Adresse
    address = extract_section_content(paras, r'^Adresse$')
    if not address:
        # Chercher un pattern code postal
        for p in paras:
            if re.search(r'\d{5}\s+[A-Z]', p):
                address = p
                break

    # Activités : paragraphes "libres" qui ne sont pas des labels connus
    label_patterns = [
        'OUVERTURE', 'CONDITIONS', 'APPELLATION', 'VINS', 'OFFRES',
        'Adresse', 'Téléphone', 'E-Mail', 'Facebook', 'Instagram', 'Google',
        'CONDITIONS', 'PROMOTIONNELLES', 'Maison', 'La Verrerie', 'www.', 'PAUILLAC'
    ]
    activities = []
    for p in paras:
        if len(p) < 10 or len(p) > 400:
            continue
        is_label = any(pat.lower() in p.lower() for pat in label_patterns)
        if not is_label and p not in [appellation, ouverture, conditions, vins_degustation, address]:
            activities.append(p)

    # Samedi/Dimanche (depuis horaires)
    open_sat = bool(re.search(r'samedi', ouverture, re.IGNORECASE))
    open_sun = bool(re.search(r'dimanche', ouverture, re.IGNORECASE))
    if not open_sat and not open_sun:
        # Chercher dans tout le texte de la page
        all_text = ' '.join(paras)
        open_sat = bool(re.search(r'samedi', all_text, re.IGNORECASE))
        open_sun = bool(re.search(r'dimanche', all_text, re.IGNORECASE))
    open_days = []
    if open_sat:
        open_days.append('Samedi')
    if open_sun:
        open_days.append('Dimanche')
    if not open_days:
        open_days = ['Samedi', 'Dimanche']  # défaut

    return {
        'name': name,
        'appellation': appellation or 'Médoc',
        'image': image,
        'address': address,
        'openDays': open_days,
        'hours': ouverture or '10h - 18h',
        'visitConditions': conditions,
        'winesInDegustation': vins_degustation,
        'activities': activities[:6],  # max 6 activités
        'sourceUrl': url,
    }


# ── Mappage appellation → couleur région ─────────────────────────────────────────

APPELLATION_TO_REGION = {
    'margaux':       'Bordeaux · Margaux',
    'pauillac':      'Bordeaux · Pauillac',
    'saint-julien':  'Bordeaux · Saint-Julien',
    'saint-estèphe': 'Bordeaux · Saint-Estèphe',
    'saint-estephe': 'Bordeaux · Saint-Estèphe',
    'haut-médoc':    'Bordeaux · Haut-Médoc',
    'haut-medoc':    'Bordeaux · Haut-Médoc',
    'listrac':       'Bordeaux · Listrac',
    'moulis':        'Bordeaux · Moulis',
    'médoc':         'Bordeaux · Médoc',
    'medoc':         'Bordeaux · Médoc',
}

# Préfixe de stand par appellation (pour le tri dans VisitePage)
APPELLATION_PREFIX = {
    'margaux':       'MAR',
    'pauillac':      'PAU',
    'saint-julien':  'SJ',
    'saint-estèphe': 'SE',
    'saint-estephe': 'SE',
    'haut-médoc':    'HM',
    'haut-medoc':    'HM',
    'listrac':       'LIS',
    'moulis':        'MOU',
    'médoc':         'MED',
    'medoc':         'MED',
}


def get_appellation_key(appellation: str) -> str:
    a = appellation.lower().replace('–', '-').replace('—', '-').strip()
    for key in APPELLATION_PREFIX:
        if key in a:
            return key
    return 'medoc'


# ── Main ─────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Scraper Portes Ouvertes du Médoc')
    parser.add_argument('--event-id',   default='po-medoc-2026', help='ID de l\'événement')
    parser.add_argument('--event-name', default='Portes Ouvertes des Châteaux du Médoc')
    parser.add_argument('--location',   default='Médoc, Gironde')
    parser.add_argument('--dates',      default='28 & 29 mars 2026')
    parser.add_argument('--output',     default=None, help='Répertoire de sortie')
    parser.add_argument('--delay',      type=float, default=0.5, help='Délai entre requêtes (sec)')
    parser.add_argument('--max',        type=int,   default=0,   help='Nombre max de châteaux (0=tous)')
    args = parser.parse_args()

    # Répertoire de sortie
    if args.output:
        out_dir = Path(args.output)
    else:
        script_dir = Path(__file__).parent
        out_dir = script_dir / 'ESSAIS SITE' / 'public'

    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f'exposants-{args.event_id}.json'

    print(f'== Portes Ouvertes du Médoc Scraper ==')
    print(f'Événement : {args.event_id}')
    print(f'Sortie    : {out_file}')
    print()

    # 1) Récupérer la page liste
    print(f'[1/3] Téléchargement de la liste des châteaux...')
    try:
        html_list = fetch_html(LIST_URL)
    except Exception as e:
        print(f'ERREUR : impossible de lire la page liste: {e}', file=sys.stderr)
        sys.exit(1)

    chateau_urls = get_chateau_urls(html_list)
    print(f'  → {len(chateau_urls)} châteaux trouvés')

    if args.max > 0:
        chateau_urls = chateau_urls[:args.max]
        print(f'  → Limité à {args.max} châteaux')

    # 2) Scraper chaque château
    print(f'[2/3] Scraping des pages châteaux...')

    # Compteur par préfixe d'appellation
    prefix_counters: dict[str, int] = {}

    exposants = []
    for i, url in enumerate(chateau_urls):
        name_short = url.rstrip('/').split('/')[-1]
        print(f'  [{i+1:3d}/{len(chateau_urls)}] {name_short}', end='', flush=True)

        data = extract_chateau_page(url)
        if not data or not data.get('name'):
            print(' ⚠ (ignoré)')
            time.sleep(args.delay)
            continue

        # Déterminer le préfixe de stand
        app_key = get_appellation_key(data.get('appellation', ''))
        prefix = APPELLATION_PREFIX.get(app_key, 'MED')
        prefix_counters[prefix] = prefix_counters.get(prefix, 0) + 1
        stand = f'{prefix} {prefix_counters[prefix]:02d}'

        # Région (pour la couleur dans VisitePage)
        region = APPELLATION_TO_REGION.get(app_key, f"Bordeaux · {data.get('appellation', 'Médoc')}")

        exposant = {
            'stand': stand,
            'name': data['name'],
            'viPath': data['sourceUrl'],
            'region': region,
            'appellation': data.get('appellation', ''),
            'image': data.get('image', ''),
            'address': data.get('address', ''),
            'openDays': data.get('openDays', ['Samedi', 'Dimanche']),
            'hours': data.get('hours', '10h - 18h'),
            'visitConditions': data.get('visitConditions', ''),
            'winesInDegustation': data.get('winesInDegustation', ''),
            'activities': data.get('activities', []),
            'hasDbMatch': False,
            'producerCode': '',
            'producerNameDb': '',
            'wineResults': [],
        }
        exposants.append(exposant)
        print(f' → {data["name"]} [{stand}] ({region})')
        time.sleep(args.delay)

    print()

    # 3) Sauvegarder le JSON
    print(f'[3/3] Sauvegarde du JSON...')

    # Résumé par appellation
    appellation_counts: dict[str, int] = {}
    for e in exposants:
        app = e.get('appellation', 'Médoc')
        appellation_counts[app] = appellation_counts.get(app, 0) + 1

    output = {
        'eventId': args.event_id,
        'eventName': args.event_name,
        'location': args.location,
        'dates': args.dates,
        'sourceUrl': LIST_URL,
        'eventInfoUrl': EVENT_URL,
        'generatedAt': datetime.now().isoformat(),
        'totalExposants': len(exposants),
        'matchesFound': 0,
        'noMatches': len(exposants),
        'type': 'portes-ouvertes',
        'appellationStats': appellation_counts,
        'exposants': exposants,
    }

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'  → Fichier sauvegardé : {out_file}')
    print()
    print('── Résumé ──────────────────────────────────────────────')
    print(f'Total exposants: {len(exposants)}')
    print(f'Avec match BDD: 0')
    print(f'Sans match BDD: {len(exposants)}')
    print()
    print('Répartition par appellation :')
    for app, count in sorted(appellation_counts.items(), key=lambda x: -x[1]):
        print(f'  {app:30s} : {count}')


if __name__ == '__main__':
    main()
