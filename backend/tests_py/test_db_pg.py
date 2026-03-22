"""
test_db_pg.py — Tests pour db_pg.py (normalisation et connexion PostgreSQL).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import patch, MagicMock
import pytest
from db_pg import normalize, get_db, PGCursor, PGConnection


# ==============================================================================
#  Tests normalize()
# ==============================================================================

class TestNormalize:
    """Tests pour la fonction normalize() — normalisation accent-insensitive."""

    def test_normalize_simple(self):
        """Teste la normalisation simple."""
        assert normalize("Château") == "chateau"
        assert normalize("BORDEAUX") == "bordeaux"

    def test_normalize_accents(self):
        """Teste la suppression des accents."""
        assert normalize("été") == "ete"
        assert normalize("café") == "cafe"
        assert normalize("à") == "a"
        assert normalize("ù") == "u"
        assert normalize("é") == "e"

    def test_normalize_spaces(self):
        """Teste le strip des espaces (strip() seulement, pas de normalisation multi-espaces)."""
        assert normalize("  spaces  ") == "spaces"
        # La fonction normalize() strip() seulement, ne normalise pas les espaces internes
        assert normalize("  Château Margaux  ") == "chateau margaux"

    def test_normalize_mixed(self):
        """Teste la combinaison : accents + casse + espaces."""
        assert normalize("été à Pauillac") == "ete a pauillac"
        assert normalize("  ÉTÉ À PAUILLAC  ") == "ete a pauillac"

    def test_normalize_empty(self):
        """Teste la chaîne vide."""
        assert normalize("") == ""
        assert normalize("   ") == ""

    def test_normalize_special_chars(self):
        """Teste avec caractères spéciaux NFD."""
        # é peut être représenté comme e + accent combinant
        assert normalize("é") == "e"
        assert normalize("ô") == "o"


# ==============================================================================
#  Tests get_db()
# ==============================================================================

class TestGetDb:
    """Tests pour la fonction get_db()."""

    def test_get_db_no_env(self):
        """Test get_db() sans DATABASE_URL → EnvironmentError."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(EnvironmentError) as exc_info:
                get_db()
            assert "DATABASE_URL" in str(exc_info.value)

    def test_get_db_with_env(self):
        """Test get_db() avec DATABASE_URL défini."""
        db_url = "postgresql://user:pass@localhost/testdb"
        with patch.dict(os.environ, {'DATABASE_URL': db_url}):
            with patch('psycopg2.connect') as mock_connect:
                mock_psyconn = MagicMock()
                mock_connect.return_value = mock_psyconn

                conn = get_db()
                assert isinstance(conn, PGConnection)
                mock_connect.assert_called_once()


# ==============================================================================
#  Tests PGCursor
# ==============================================================================

class TestPGCursor:
    """Tests pour la classe PGCursor."""

    def test_cursor_init(self):
        """Test l'initialisation du cursor."""
        mock_cur = MagicMock()
        cursor = PGCursor(mock_cur)
        assert cursor._cur is mock_cur
        assert cursor.rowcount == 0
        assert cursor.lastrowid is None

    def test_cursor_execute(self):
        """Test execute() délègue au _cur."""
        mock_cur = MagicMock()
        mock_cur.rowcount = 5
        cursor = PGCursor(mock_cur)

        result = cursor.execute("SELECT * FROM producers", ())

        assert result is cursor  # Retourne self
        assert cursor.rowcount == 5
        mock_cur.execute.assert_called_once_with("SELECT * FROM producers", ())

    def test_cursor_execute_with_params(self):
        """Test execute() avec paramètres."""
        mock_cur = MagicMock()
        cursor = PGCursor(mock_cur)

        cursor.execute("SELECT * FROM producers WHERE code=%s", ("123",))

        mock_cur.execute.assert_called_once_with(
            "SELECT * FROM producers WHERE code=%s", ("123",)
        )

    def test_cursor_fetchone(self):
        """Test fetchone() délègue au _cur."""
        mock_cur = MagicMock()
        mock_cur.fetchone.return_value = {"code": "123", "name": "Test"}
        cursor = PGCursor(mock_cur)

        result = cursor.fetchone()

        assert result == {"code": "123", "name": "Test"}
        mock_cur.fetchone.assert_called_once()

    def test_cursor_fetchall(self):
        """Test fetchall() délègue au _cur."""
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = [
            {"code": "1", "name": "A"},
            {"code": "2", "name": "B"},
        ]
        cursor = PGCursor(mock_cur)

        result = cursor.fetchall()

        assert len(result) == 2
        assert result[0]["name"] == "A"
        mock_cur.fetchall.assert_called_once()

    def test_cursor_iter(self):
        """Test itération sur cursor."""
        mock_cur = MagicMock()
        mock_cur.fetchall.return_value = [
            {"code": "1"},
            {"code": "2"},
        ]
        cursor = PGCursor(mock_cur)

        items = list(cursor)

        assert len(items) == 2
        assert items[0]["code"] == "1"


# ==============================================================================
#  Tests PGConnection
# ==============================================================================

class TestPGConnection:
    """Tests pour la classe PGConnection."""

    @patch('psycopg2.connect')
    def test_connection_init(self, mock_connect):
        """Test l'initialisation de PGConnection."""
        mock_psyconn = MagicMock()
        mock_connect.return_value = mock_psyconn

        conn = PGConnection("postgresql://test")

        assert conn._conn is mock_psyconn
        mock_connect.assert_called_once()

    @patch('psycopg2.connect')
    def test_connection_cursor(self, mock_connect):
        """Test cursor() retourne PGCursor."""
        mock_psyconn = MagicMock()
        mock_cur = MagicMock()
        mock_psyconn.cursor.return_value = mock_cur
        mock_connect.return_value = mock_psyconn

        conn = PGConnection("postgresql://test")
        cursor = conn.cursor()

        assert isinstance(cursor, PGCursor)
        mock_psyconn.cursor.assert_called_once()

    @patch('psycopg2.connect')
    def test_connection_execute(self, mock_connect):
        """Test execute() retourne PGCursor."""
        mock_psyconn = MagicMock()
        mock_cur = MagicMock()
        mock_psyconn.cursor.return_value = mock_cur
        mock_cur.rowcount = 3
        mock_connect.return_value = mock_psyconn

        conn = PGConnection("postgresql://test")
        cursor = conn.execute("SELECT * FROM wines", ())

        assert isinstance(cursor, PGCursor)
        assert cursor.rowcount == 3

    @patch('psycopg2.connect')
    def test_connection_commit(self, mock_connect):
        """Test commit() délègue."""
        mock_psyconn = MagicMock()
        mock_connect.return_value = mock_psyconn

        conn = PGConnection("postgresql://test")
        conn.commit()

        mock_psyconn.commit.assert_called_once()

    @patch('psycopg2.connect')
    def test_connection_close(self, mock_connect):
        """Test close() délègue."""
        mock_psyconn = MagicMock()
        mock_connect.return_value = mock_psyconn

        conn = PGConnection("postgresql://test")
        conn.close()

        mock_psyconn.close.assert_called_once()
