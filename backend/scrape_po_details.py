#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scrape_po_details.py — Script de référence pour enrichir les exposants PO.

Pour chaque événement de type "Portes Ouvertes", ce script :
  1. Scrape les pages de listing thématiques (restauration / animations / musée)
     afin de détecter quels châteaux proposent ces services.
  2. Scrape la page individuelle de chaque château (via le champ `viPath` du JSON
     exposants) pour en extraire les descriptions textuelles correspondantes.
  3. Persiste les résultats en base PostgreSQL (table `po_details`).
  4. Enrichit le fichier JSON exposants avec les nouveaux champs
     hasRestauration / restaurationDesc / hasAnimation / animationDesc /
     hasMusee / museeDesc.

Usage :
    python scrape_po_details.py \\
        --event-id   po-medoc-2026 \\
        --event-type po-medoc \\
        --exposants-json "C:/…/frontend/public/exposants-po-medoc-2026.json"

    # Test rapide sur 5 châteaux seulement :
    python scrape_po_details.py --event-id po-medoc-2026 --event-type po-medoc \\
        --exposants-json "…/exposants-po-medoc-2026.json" --max 5

Architecture config-driven :
    PO_CONFIGS permet d'ajouter de futurs événements PO sans modifier le code
    de scraping — seule la config change.
"""

import argparse
import io
import json
import re
import sys
import time
import unicodedata
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Optional

# Forcer UTF-8 sur stdout/stderr (Windows)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# ── Configuration par type d'événement PO ────────────────────────────────────
#
# Pour ajouter un nouvel événement PO, dupliquer une entrée et renseigner
# les URLs spécifiques au site de cet événement.
# Les clés resto_url / anim_url / musee_url sont optionnelles (None = page absente).

PO_CONFIGS: dict[str, dict] = {
    'po-medoc': {
        'base_url': 'https://portesouvertesenmedoc.fr',
        'resto_url': '/printemps-des-chateaux-restauration/',
        'anim_url':  '/printemps-des-chateaux-animations/',
        'musee_url': '/printemps-des-chateaux-musee-et-collection/',
    },
    # Exemples de futurs événements — à compléter selon le site réel :
    # 'po-sauternes': {
    #     'base_url': 'https://example-sauternes.fr',
    #     'resto_url': '/chateaux-restauration/',
    #     'anim_url':  '/chateaux-animations/',
    #     'musee_url': None,
    # },
    # 'po-blaye': {
    #     'base_url': 'https://example-blaye.fr',
    #     'resto_url': '/restauration/',
    #     'anim_url':  '/animations/',
    #     'musee_url': '/musees/',
    # },
}

# En-têtes HTTP standard pour éviter les blocages
HEADERS: dict[str, str] = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9',
}

# Nombre de tentatives en cas d'erreur réseau
MAX_RETRIES: int = 3

# Délai par défaut entre requêtes (secondes) — remplacé par --delay
DEFAULT_DELAY: float = 0.5


# ── Utilitaires ───────────────────────────────────────────────────────────────

def normalize(s: str) -> str:
    """
    Normalisation accent-insensible identique à db_pg.py et wineSearch.js.

    Applique NFKD, supprime les diacritiques, passe en minuscules.
    Utilisée pour matcher les noms de châteaux entre sources hétérogènes.

    Args:
        s: Chaîne à normaliser.

    Returns:
        Chaîne normalisée sans accents, en minuscules.
    """
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def fetch_html(url: str, timeout: int = 20, retries: int = MAX_RETRIES) -> str:
    """
    Télécharge une page HTML avec retry automatique.

    Args:
        url:     URL à télécharger.
        timeout: Délai d'attente réseau en secondes.
        retries: Nombre de tentatives avant abandon.

    Returns:
        Contenu HTML décodé en UTF-8.

    Raises:
        Exception: Si toutes les tentatives ont échoué.
    """
    last_exc: Optional[Exception] = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            return urllib.request.urlopen(req, timeout=timeout).read().decode(
                'utf-8', errors='replace'
            )
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                wait = attempt * 1.0  # back-off simple : 1s, 2s, 3s
                print(
                    f'    [tentative {attempt}/{retries}] Erreur fetch {url}: {exc}'
                    f' — nouvel essai dans {wait:.0f}s',
                    file=sys.stderr,
                )
                time.sleep(wait)
    raise Exception(f'Impossible de récupérer {url} après {retries} tentatives : {last_exc}')


def clean_text(html_fragment: str) -> str:
    """
    Supprime les balises HTML et nettoie les espaces d'un fragment.

    Args:
        html_fragment: Fragment HTML brut.

    Returns:
        Texte visible, espaces normalisés.
    """
    text = re.sub(r'<[^>]+>', ' ', html_fragment)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&#039;', "'", text)
    text = re.sub(r'&[a-z]+;', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


# ── Scraping pages de listing thématiques ────────────────────────────────────

def scrape_listing_page(url: str) -> set[str]:
    """
    Récupère la liste des châteaux présents sur une page de listing thématique.

    Exemple : page /printemps-des-chateaux-restauration/ contient les liens
    vers tous les châteaux proposant de la restauration.

    Args:
        url: URL complète de la page de listing.

    Returns:
        Ensemble des noms normalisés des châteaux trouvés sur la page.
        Ensemble vide si la page est inaccessible.
    """
    try:
        html = fetch_html(url)
    except Exception as exc:
        print(f'  [listing] Impossible de lire {url}: {exc}', file=sys.stderr)
        return set()

    # Extraire les titres h2 / h3 / h4 et les textes des liens internes
    # qui correspondent à des noms de châteaux.
    # Sur portesouvertesenmedoc.fr, chaque château est un article avec un lien.
    names: set[str] = set()

    # Méthode 1 : liens internes vers des pages château
    base_domain = re.search(r'https?://[^/]+', url)
    if base_domain:
        domain = base_domain.group(0)
        internal_links = re.findall(
            rf'href="{re.escape(domain)}/([^"?#]+/)"[^>]*>(.*?)</a>',
            html,
            re.DOTALL,
        )
        for _path, link_text in internal_links:
            text = clean_text(link_text)
            if text and len(text) > 3:
                names.add(normalize(text))

    # Méthode 2 : headings h2/h3 qui ressemblent à des noms de châteaux
    headings = re.findall(r'<h[234][^>]*>(.*?)</h[234]>', html, re.DOTALL)
    for h in headings:
        text = clean_text(h)
        # Garder seulement les headings qui ressemblent à un château
        if text and len(text) > 3 and len(text) < 120:
            if re.search(r'château|domaine|clos|vignoble|manoir', text, re.IGNORECASE):
                names.add(normalize(text))

    print(f'    -> {len(names)} noms extraits depuis listing')
    return names


# ── Scraping page individuelle d'un château ───────────────────────────────────

def extract_section_after_heading(
    paragraphs: list[str],
    heading_pattern: str,
    max_paragraphs: int = 3,
) -> str:
    """
    Trouve un heading court correspondant à heading_pattern et retourne
    le texte des paragraphes qui suivent (jusqu'au prochain heading ou max_paragraphs).

    Cette fonction est utilisée pour extraire les sections "Restauration",
    "Animations", "Musée" depuis la page d'un château.

    Args:
        paragraphs:      Liste de paragraphes de texte visible.
        heading_pattern: Expression régulière à chercher dans le heading.
        max_paragraphs:  Nombre max de paragraphes à collecter après le heading.

    Returns:
        Texte concaténé des paragraphes suivants, ou chaîne vide si non trouvé.
    """
    for i, para in enumerate(paragraphs):
        # Un heading est un paragraphe court (< 100 chars) qui correspond au pattern
        if len(para) < 100 and re.search(heading_pattern, para, re.IGNORECASE):
            collected: list[str] = []
            for j in range(i + 1, min(i + 1 + max_paragraphs, len(paragraphs))):
                next_para = paragraphs[j]
                # Arrêter si on atteint un autre heading (court et capitalisé)
                if len(next_para) < 80 and next_para == next_para.upper() and len(next_para) > 3:
                    break
                if next_para:
                    collected.append(next_para)
            return ' '.join(collected).strip()
    return ''


def extract_section_from_html(html: str, heading_pattern: str) -> str:
    """
    Alternative plus robuste : cherche un heading h2/h3 dans le HTML brut
    et extrait les paragraphes suivants jusqu'au prochain heading.

    Complète extract_section_after_heading pour les pages avec une structure
    HTML explicite (sections avec headings réels).

    Args:
        html:            HTML nettoyé (sans scripts/styles).
        heading_pattern: Expression régulière à chercher dans le texte du heading.

    Returns:
        Texte extrait, ou chaîne vide.
    """
    # Chercher un heading h2 ou h3 correspondant au pattern
    heading_match = re.search(
        r'<h[23][^>]*>(.*?)</h[23]>(.*?)(?=<h[23]|<\/section|<\/div\s*class="entry|$)',
        html,
        re.DOTALL | re.IGNORECASE,
    )
    # Parcourir tous les headings
    for m in re.finditer(
        r'<h[23][^>]*>(.*?)</h[23]>(.*?)(?=<h[23]|$)',
        html,
        re.DOTALL | re.IGNORECASE,
    ):
        heading_text = clean_text(m.group(1))
        if re.search(heading_pattern, heading_text, re.IGNORECASE):
            # Extraire les paragraphes dans le bloc qui suit
            block = m.group(2)
            raw_paras = re.findall(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
            texts = [clean_text(p) for p in raw_paras if clean_text(p)]
            if texts:
                return ' '.join(texts[:3])
    return ''


def scrape_chateau_details(url: str) -> dict:
    """
    Scrape la page individuelle d'un château pour en extraire les sections
    restauration, animation et musée/collection.

    Stratégie :
      1. Chercher des headings h2/h3 dans le HTML brut via extract_section_from_html.
      2. Fallback sur les paragraphes textuels via extract_section_after_heading.

    Args:
        url: URL de la page château à scraper.

    Returns:
        Dictionnaire avec les clés :
          - restauration_desc (str)  : description restauration
          - animation_desc (str)     : description animations
          - musee_desc (str)         : description musée/collection
        Toutes les valeurs sont des chaînes vides si la section n'est pas trouvée.
    """
    try:
        html = fetch_html(url)
    except Exception as exc:
        print(f'    [chateau] Erreur fetch {url}: {exc}', file=sys.stderr)
        return {'restauration_desc': '', 'animation_desc': '', 'musee_desc': ''}

    # Nettoyer le HTML (retirer scripts et styles)
    clean = re.sub(r'<style[^>]*>.*?</style>', ' ', html, flags=re.DOTALL)
    clean = re.sub(r'<script[^>]*>.*?</script>', ' ', clean, flags=re.DOTALL)

    # --- Tentative 1 : extraction depuis headings HTML ----------------------
    resto_desc = extract_section_from_html(
        clean, r'restaur'
    )
    anim_desc = extract_section_from_html(
        clean, r'animation|pour les enfants|activit'
    )
    musee_desc = extract_section_from_html(
        clean, r'mus[eé]e|collection|exposition'
    )

    # --- Tentative 2 (fallback) : extraction depuis paragraphes textuels ----
    if not resto_desc or not anim_desc or not musee_desc:
        raw_paras = re.findall(r'<p[^>]*>(.*?)</p>', clean, re.DOTALL)
        paragraphs = [clean_text(p) for p in raw_paras]
        paragraphs = [p for p in paragraphs if len(p) > 2]

        if not resto_desc:
            resto_desc = extract_section_after_heading(
                paragraphs, r'restaur'
            )
        if not anim_desc:
            anim_desc = extract_section_after_heading(
                paragraphs, r'animation|pour les enfants|activit'
            )
        if not musee_desc:
            musee_desc = extract_section_after_heading(
                paragraphs, r'mus[eé]e|collection|exposition'
            )

    return {
        'restauration_desc': resto_desc,
        'animation_desc':    anim_desc,
        'musee_desc':        musee_desc,
    }


# ── Base de données ───────────────────────────────────────────────────────────

def ensure_table(conn) -> None:
    """
    Crée la table `po_details` en base si elle n'existe pas déjà.

    Lit et exécute le fichier SQL migrations/create_po_details.sql
    situé à côté de ce script.

    Args:
        conn: Connexion PGConnection (db_pg.py).
    """
    sql_file = Path(__file__).parent / 'migrations' / 'create_po_details.sql'
    if sql_file.exists():
        sql = sql_file.read_text(encoding='utf-8')
        # Exécuter chaque instruction séparément (CREATE TABLE + CREATE INDEX)
        for statement in sql.split(';'):
            statement = statement.strip()
            if statement:
                conn.execute(statement)
    else:
        # Fallback inline si le fichier SQL est absent
        conn.execute("""
            CREATE TABLE IF NOT EXISTS po_details (
                id               SERIAL PRIMARY KEY,
                event_id         VARCHAR(100)  NOT NULL,
                chateau_name     VARCHAR(300)  NOT NULL,
                chateau_url      VARCHAR(500),
                has_restauration BOOLEAN       DEFAULT FALSE,
                restauration_desc TEXT,
                has_animation    BOOLEAN       DEFAULT FALSE,
                animation_desc   TEXT,
                has_musee        BOOLEAN       DEFAULT FALSE,
                musee_desc       TEXT,
                scraped_at       TIMESTAMP     DEFAULT NOW(),
                UNIQUE(event_id, chateau_name)
            )
        """)
        conn.execute(
            'CREATE INDEX IF NOT EXISTS idx_po_details_event_id ON po_details(event_id)'
        )
    conn.commit()
    print('  [db] Table po_details prête.')


def upsert_chateau(conn, event_id: str, chateau: dict) -> None:
    """
    Insère ou met à jour un enregistrement château dans `po_details`.

    Utilise INSERT … ON CONFLICT DO UPDATE (upsert PostgreSQL) pour être
    idempotent — relancer le script ne crée pas de doublons.

    Args:
        conn:      Connexion PGConnection.
        event_id:  Identifiant de l'événement (ex: 'po-medoc-2026').
        chateau:   Dictionnaire contenant les champs du château.
    """
    conn.execute(
        """
        INSERT INTO po_details (
            event_id, chateau_name, chateau_url,
            has_restauration, restauration_desc,
            has_animation,    animation_desc,
            has_musee,        musee_desc,
            scraped_at
        ) VALUES (
            %s, %s, %s,
            %s, %s,
            %s, %s,
            %s, %s,
            NOW()
        )
        ON CONFLICT (event_id, chateau_name)
        DO UPDATE SET
            chateau_url       = EXCLUDED.chateau_url,
            has_restauration  = EXCLUDED.has_restauration,
            restauration_desc = EXCLUDED.restauration_desc,
            has_animation     = EXCLUDED.has_animation,
            animation_desc    = EXCLUDED.animation_desc,
            has_musee         = EXCLUDED.has_musee,
            musee_desc        = EXCLUDED.musee_desc,
            scraped_at        = NOW()
        """,
        (
            event_id,
            chateau['name'],
            chateau.get('chateau_url', ''),
            chateau.get('has_restauration', False),
            chateau.get('restauration_desc', ''),
            chateau.get('has_animation', False),
            chateau.get('animation_desc', ''),
            chateau.get('has_musee', False),
            chateau.get('musee_desc', ''),
        ),
    )


# ── Logique principale ────────────────────────────────────────────────────────

def run(args: argparse.Namespace) -> None:
    """
    Orchestration complète du scraping PO details.

    Étapes :
      1. Charger la configuration PO (PO_CONFIGS).
      2. Charger le fichier JSON exposants.
      3. Scraper les 3 pages de listing thématiques.
      4. Pour chaque exposant avec viPath, scraper sa page individuelle.
      5. Sauvegarder en PostgreSQL.
      6. Enrichir et réécrire le fichier JSON.

    Args:
        args: Namespace argparse avec event_id, event_type, exposants_json,
              delay, max, no_db.
    """
    # 0) Vérifier la config
    config = PO_CONFIGS.get(args.event_type)
    if config is None:
        available = ', '.join(PO_CONFIGS.keys())
        print(
            f'ERREUR : type d\'événement "{args.event_type}" inconnu.\n'
            f'Types disponibles : {available}',
            file=sys.stderr,
        )
        sys.exit(1)

    base_url = config['base_url']
    print(f'== scrape_po_details.py ==')
    print(f'Événement  : {args.event_id}')
    print(f'Type       : {args.event_type}')
    print(f'JSON       : {args.exposants_json}')
    print(f'Base URL   : {base_url}')
    print()

    # 1) Charger le fichier JSON exposants
    json_path = Path(args.exposants_json)
    if not json_path.exists():
        print(f'ERREUR : fichier JSON introuvable : {json_path}', file=sys.stderr)
        sys.exit(1)

    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    exposants: list[dict] = data.get('exposants', [])
    print(f'[0] {len(exposants)} exposants chargés depuis le JSON.')

    if args.max > 0:
        exposants = exposants[:args.max]
        print(f'    -> Limité à {args.max} exposants (mode --max).')

    # 2) Scraper les pages de listing thématiques
    print()
    print('[1/3] Scraping des pages de listing thématiques...')

    resto_names: set[str] = set()
    anim_names: set[str] = set()
    musee_names: set[str] = set()

    listing_pages = [
        ('restauration', config.get('resto_url'), resto_names),
        ('animations',   config.get('anim_url'),  anim_names),
        ('musee',        config.get('musee_url'),  musee_names),
    ]

    for label, url_path, name_set in listing_pages:
        if not url_path:
            print(f'  [{label}] Pas d\'URL configurée — ignoré.')
            continue
        full_url = base_url + url_path
        print(f'  [{label}] {full_url}')
        extracted = scrape_listing_page(full_url)
        name_set.update(extracted)
        time.sleep(args.delay)

    print(
        f'  -> Restauration : {len(resto_names)} châteaux | '
        f'Animations : {len(anim_names)} | '
        f'Musée : {len(musee_names)}'
    )

    # 3) Scraper chaque page château individuelle
    print()
    print('[2/3] Scraping des pages châteaux individuelles...')

    results: list[dict] = []
    total = len(exposants)

    for i, exposant in enumerate(exposants):
        vi_path: str = exposant.get('viPath', '')
        name: str = exposant.get('name', f'exposant_{i}')
        name_norm = normalize(name)

        # Déterminer si le château est dans les listes de listing
        # Matching par normalisation : on cherche si le nom normalisé
        # du château est contenu dans un des noms extraits du listing,
        # ou si un des noms du listing est contenu dans le nom normalisé.
        def matches_listing(name_norm: str, listing_set: set[str]) -> bool:
            """Retourne True si name_norm matche un des noms du listing."""
            for lname in listing_set:
                if name_norm in lname or lname in name_norm:
                    return True
                # Matching partiel sur les mots significatifs (>= 5 chars)
                words = [w for w in name_norm.split() if len(w) >= 5]
                if words and all(w in lname for w in words):
                    return True
            return False

        has_resto_listing = matches_listing(name_norm, resto_names)
        has_anim_listing  = matches_listing(name_norm, anim_names)
        has_musee_listing = matches_listing(name_norm, musee_names)

        print(
            f'  [{i+1:3d}/{total}] {name[:50]}'
            + (' [R]' if has_resto_listing else '')
            + (' [A]' if has_anim_listing  else '')
            + (' [M]' if has_musee_listing else ''),
            end='',
            flush=True,
        )

        # Scraper la page individuelle si viPath est disponible
        detail: dict = {'restauration_desc': '', 'animation_desc': '', 'musee_desc': ''}
        if vi_path:
            detail = scrape_chateau_details(vi_path)
            # Si la description est vide mais listing dit oui → marquer quand même
            has_resto = has_resto_listing or bool(detail['restauration_desc'])
            has_anim  = has_anim_listing  or bool(detail['animation_desc'])
            has_musee = has_musee_listing or bool(detail['musee_desc'])
        else:
            has_resto = has_resto_listing
            has_anim  = has_anim_listing
            has_musee = has_musee_listing

        result = {
            'name':              name,
            'chateau_url':       vi_path,
            'has_restauration':  has_resto,
            'restauration_desc': detail['restauration_desc'],
            'has_animation':     has_anim,
            'animation_desc':    detail['animation_desc'],
            'has_musee':         has_musee,
            'musee_desc':        detail['musee_desc'],
        }
        results.append(result)

        flags = []
        if has_resto: flags.append('resto')
        if has_anim:  flags.append('anim')
        if has_musee: flags.append('musee')
        print(f' -> {", ".join(flags) if flags else "rien"}')

        time.sleep(args.delay)

    # 4) Sauvegarder en PostgreSQL
    if not args.no_db:
        print()
        print('[3a/3] Sauvegarde en base PostgreSQL...')
        try:
            from db_pg import get_db
            conn = get_db()
            ensure_table(conn)

            saved = 0
            for result in results:
                try:
                    upsert_chateau(conn, args.event_id, result)
                    saved += 1
                except Exception as exc:
                    print(
                        f'  [db] Erreur upsert "{result["name"]}": {exc}',
                        file=sys.stderr,
                    )
            conn.commit()
            conn.close()
            print(f'  -> {saved}/{len(results)} châteaux sauvegardés en BDD.')
        except Exception as exc:
            print(f'  [db] Impossible de sauvegarder en BDD: {exc}', file=sys.stderr)
            print('  -> Poursuite sans BDD (résultats JSON uniquement).', file=sys.stderr)
    else:
        print()
        print('[3a/3] BDD ignorée (--no-db).')

    # 5) Enrichir le fichier JSON exposants
    print()
    print('[3b/3] Enrichissement du JSON exposants...')

    # Construire un index des résultats par nom normalisé
    results_by_norm: dict[str, dict] = {normalize(r['name']): r for r in results}

    enriched_count = 0
    for exposant in data['exposants']:
        name_norm = normalize(exposant.get('name', ''))
        result = results_by_norm.get(name_norm)
        if result is None:
            # Fallback : chercher par correspondance partielle
            for norm_key, r in results_by_norm.items():
                if name_norm in norm_key or norm_key in name_norm:
                    result = r
                    break

        if result:
            exposant['hasRestauration']  = result['has_restauration']
            exposant['restaurationDesc'] = result['restauration_desc']
            exposant['hasAnimation']     = result['has_animation']
            exposant['animationDesc']    = result['animation_desc']
            exposant['hasMusee']         = result['has_musee']
            exposant['museeDesc']        = result['musee_desc']
            enriched_count += 1

    # Mettre à jour les métadonnées du JSON
    data['poDetailsScrapedAt'] = datetime.now().isoformat()
    data['poDetailsCount'] = enriched_count

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'  -> {enriched_count} exposants enrichis dans {json_path}')

    # 6) Résumé final
    print()
    print('── Résumé ──────────────────────────────────────────────────')
    print(f'Total traités   : {len(results)}')
    print(f'Avec restauration: {sum(1 for r in results if r["has_restauration"])}')
    print(f'Avec animations  : {sum(1 for r in results if r["has_animation"])}')
    print(f'Avec musée       : {sum(1 for r in results if r["has_musee"])}')
    print(f'JSON enrichi     : {json_path}')
    print()


# ── Entrée CLI ────────────────────────────────────────────────────────────────

def main() -> None:
    """Point d'entrée principal — parse les arguments et appelle run()."""
    parser = argparse.ArgumentParser(
        description=(
            'Enrichit un fichier JSON exposants PO avec restauration / animations / musée.\n'
            'Scrape les pages listing et les pages individuelles du site PO.'
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
            Exemples :
              python scrape_po_details.py \\
                --event-id po-medoc-2026 \\
                --event-type po-medoc \\
                --exposants-json "C:/…/exposants-po-medoc-2026.json"

              # Test rapide sur 5 châteaux, sans écrire en BDD :
              python scrape_po_details.py \\
                --event-id po-medoc-2026 --event-type po-medoc \\
                --exposants-json "…/exposants-po-medoc-2026.json" \\
                --max 5 --no-db
        """),
    )
    parser.add_argument(
        '--event-id',
        required=True,
        help='Identifiant de l\'événement (ex: po-medoc-2026)',
    )
    parser.add_argument(
        '--event-type',
        required=True,
        help=f'Type PO — clé dans PO_CONFIGS. Disponibles : {", ".join(PO_CONFIGS.keys())}',
    )
    parser.add_argument(
        '--exposants-json',
        required=True,
        help='Chemin absolu vers le fichier exposants-{eventId}.json',
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=DEFAULT_DELAY,
        help=f'Délai entre requêtes en secondes (défaut: {DEFAULT_DELAY})',
    )
    parser.add_argument(
        '--max',
        type=int,
        default=0,
        help='Nombre max de châteaux à traiter (0 = tous)',
    )
    parser.add_argument(
        '--no-db',
        action='store_true',
        help='Ne pas sauvegarder en PostgreSQL (mode test)',
    )

    args = parser.parse_args()
    run(args)


# Import textwrap nécessaire pour le docstring du parser
import textwrap  # noqa: E402 (import en fin de fichier, après les fonctions)

if __name__ == '__main__':
    main()
