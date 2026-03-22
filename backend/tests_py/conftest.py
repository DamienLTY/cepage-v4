"""
conftest.py — Fixtures et configuration pytest pour les tests des scripts Python de scraping.

Mock le module 'config' qui n'existe plus en Node.js, et fournit les fixtures
communes pour les tests db_pg, scraper, fetcher, etc.
"""

import sys
import os
from unittest.mock import MagicMock, patch
import pytest

# Mock le module 'config' Python (qui n'existe plus après migration Node.js)
# scraper.py et fetcher.py importent : from config import BASE_URL, REGIONS, etc.
config_mock = MagicMock()
config_mock.BASE_URL = 'https://www.hachette-vins.com'
config_mock.REGIONS = {
    'bordeaux': 'Bordeaux',
    'bourgogne': 'Bourgogne',
}
config_mock.ANNEE_MIN = 1990
config_mock.SCRAPLING_OK = False
config_mock.FETCHER = None
config_mock.SESSION = MagicMock()
sys.modules['config'] = config_mock


@pytest.fixture
def mock_conn():
    """Fixture : connexion PostgreSQL/SQLite mockée."""
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    cursor.fetchall.return_value = []
    cursor.fetchone.return_value = None
    cursor.rowcount = 0
    cursor.__iter__ = lambda self: iter(self.fetchall())
    conn.execute.return_value = cursor
    return conn


@pytest.fixture
def mock_db_factory(mock_conn):
    """Fixture : patch db_pg.get_db() pour retourner mock_conn."""
    with patch('db_pg.get_db', return_value=mock_conn):
        yield mock_conn


@pytest.fixture
def sample_wine_row(mock_dict_row=None):
    """Exemple de rangée vin depuis la BDD."""
    return {
        'wine_name': 'Château Margaux',
        'year': 2020,
        'stars': 3,
        'color': 'Rouge',
        'wine_type': 'Rouge tranquille',
        'link': 'https://www.hachette-vins.com/vins/123/',
    }


@pytest.fixture
def sample_producer_row(mock_dict_row=None):
    """Exemple de rangée producteur depuis la BDD."""
    return {
        'code': '12345',
        'name': 'Château Margaux',
        'region': 'Bordeaux · Margaux',
        'producer_url': '/producteurs/12345/chateau-margaux/',
    }
