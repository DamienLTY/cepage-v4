#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
config.py — Constantes globales pour les scripts Python de scraping
"""

import sys, os, warnings
warnings.filterwarnings('ignore')

from pathlib import Path

# Charger les variables d'environnement (.env)
try:
    from dotenv import load_dotenv
    _env = Path(__file__).resolve().parent.parent / '.env'
    if _env.exists():
        load_dotenv(_env)
    else:
        load_dotenv()
except ImportError:
    pass

# Fix encodage console Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ==============================================================================
#  HACHETTE
# ==============================================================================
BASE_URL  = "https://www.hachette-vins.com"
ANNEE_MIN = 1996

REGIONS = {
    "Bordeaux":           "Bordelais",
    "Bourgogne":          "Bourgogne",
    "Champagne":          "Champagne",
    "Alsace":             "Alsace",
    "Rhone":              "Vallée du Rhône",
    "Loire":              "Vallée de la Loire et Centre",
    "Languedoc":          "Languedoc",
    "Provence":           "Provence",
    "Roussillon":         "Roussillon",
    "Sud-Ouest":          "Sud-Ouest",
    "Beaujolais":         "Beaujolais et Lyonnais",
    "Corse":              "Corse",
    "Jura":               "Jura",
    "Savoie":             "Savoie et Bugey",
    "Armagnac":           "Armagnac et Cognac",
    "Lorraine":           "Lorraine",
    "Poitou-Charentes":   "Poitou-Charentes",
    "Piemont-Pyreneen":   "Le piémont Pyrénéen",
    "Vins-Suisses":       "Vins Suisses",
    "Vins-de-Pays":       "Vins de Pays",
    "Luxembourg":         "Vins du Luxembourg",
}

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36",
}

# ==============================================================================
#  DÉPENDANCES OPTIONNELLES (Scrapling, requests)
# ==============================================================================
SCRAPLING_OK = False
FETCHER = None
try:
    from scrapling.fetchers import StealthyFetcher
    # API v0.4+ : StealthyFetcher est une classe avec classmethods, pas d'instanciation
    FETCHER = StealthyFetcher
    SCRAPLING_OK = True
    print("[OK] Scrapling (StealthyFetcher) disponible")
except Exception as e:
    print(f"[INFO] Scrapling non disponible : {e}")

REQUESTS_OK = False
SESSION = None
try:
    import requests as _requests
    _requests.packages.urllib3.disable_warnings()
    REQUESTS_OK = True
    SESSION = _requests.Session()
    SESSION.headers.update(HEADERS)
except ImportError:
    pass

if not SCRAPLING_OK and not REQUESTS_OK:
    print("[ERREUR] Ni Scrapling ni requests disponibles")
    sys.exit(1)

# ==============================================================================
#  GUIDE HACHETTE
# ==============================================================================
GUIDE_YEAR = int(os.getenv('GUIDE_YEAR', '2026'))
