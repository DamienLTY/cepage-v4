#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
db_pg.py — Adaptateur PostgreSQL pour les scripts Python de scraping.
Remplace db.py (SQLite) avec une interface compatible.
"""

import os
import unicodedata
from pathlib import Path

# Charger .env si présent
try:
    from dotenv import load_dotenv
    _env = Path(__file__).parent / '.env'
    if _env.exists():
        load_dotenv(_env)
except ImportError:
    pass  # dotenv optionnel

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    raise ImportError(
        "psycopg2-binary requis.\n"
        "  pip install psycopg2-binary"
    )


# ── Normalisation ─────────────────────────────────────────────────────────────

def normalize(s: str) -> str:
    """Normalisation accent-insensitive (identique à wineSearch.js/Node.js)."""
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


# ── Connexion ─────────────────────────────────────────────────────────────────

def get_db():
    """
    Retourne une PGConnection (wrapper psycopg2) compatible SQLite API.
    Lit DATABASE_URL depuis os.environ (chargé via .env).
    """
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise EnvironmentError(
            "DATABASE_URL non défini.\n"
            "  Créez un fichier .env avec DATABASE_URL=postgresql://..."
        )
    return PGConnection(db_url)


# ── Wrappers compat SQLite ────────────────────────────────────────────────────

class PGCursor:
    """
    Wrapper autour d'un psycopg2 cursor avec interface SQLite.
    Utilise RealDictCursor → rows accessibles par row['column_name'].
    """

    def __init__(self, cur):
        self._cur = cur
        self.lastrowid = None
        self.rowcount = 0

    def execute(self, sql, params=None):
        self._cur.execute(sql, params if params is not None else ())
        self.rowcount = self._cur.rowcount
        return self

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def __iter__(self):
        return iter(self.fetchall())


class PGConnection:
    """
    Wrapper autour d'une psycopg2 connection avec interface SQLite.
    Fournit conn.execute() / conn.cursor() / conn.commit() / conn.close().
    """

    def __init__(self, dsn: str):
        self._conn = psycopg2.connect(
            dsn,
            cursor_factory=psycopg2.extras.RealDictCursor
        )

    def cursor(self) -> PGCursor:
        return PGCursor(self._conn.cursor())

    def execute(self, sql, params=None) -> PGCursor:
        cur = PGCursor(self._conn.cursor())
        cur.execute(sql, params)
        return cur

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()
