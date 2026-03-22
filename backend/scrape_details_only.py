"""
Script autonome — scrape uniquement les pages détail des vins non encore scrapées.
Lance : python scrape_details_only.py
"""
import sys
import logging
import os

# Assure que les imports relatifs fonctionnent
sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)

import config  # charge le .env depuis la racine du projet
from db_pg import get_db
from scraper import scrape_all_wine_details

def main():
    conn = get_db()
    try:
        # Compter combien restent à scraper
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*) FROM vintages v
            LEFT JOIN wine_details wd ON wd.url = v.link
            WHERE v.link IS NOT NULL AND v.link != '' AND wd.url IS NULL
        """)
        row = cur.fetchone()
        remaining = row['count'] if row else 0
        log.info(f"=== {remaining} fiches détail restantes à scraper ===")

        if remaining == 0:
            log.info("Rien à faire — toutes les fiches sont déjà scrapées.")
            return

        scraped, errors = scrape_all_wine_details(conn, limit=None, delay=0.2)
        log.info(f"=== TERMINÉ: {scraped} fiches scrapées, {errors} erreurs ===")
    finally:
        conn.close()

if __name__ == '__main__':
    main()
