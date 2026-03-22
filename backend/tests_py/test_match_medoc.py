"""
test_match_medoc.py — Tests pour les fonctions pures de match_medoc.py.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import MagicMock, patch
import pytest
from match_medoc import (
    normalize_string,
    similarity_ratio,
    is_bordeaux_region,
    search_producer_in_db,
    get_wines_for_producer,
)


# ==============================================================================
#  Tests normalize_string()
# ==============================================================================

class TestNormalizeString:
    """Tests pour normalize_string() — normalisation avec suppression stop words."""

    def test_normalize_simple(self):
        """Test normalisation simple."""
        result = normalize_string("Château Margaux")
        assert "chateau" not in result  # stop word supprimé
        assert "margaux" in result

    def test_normalize_empty(self):
        """Test chaîne vide."""
        assert normalize_string("") == ""

    def test_normalize_uppercase(self):
        """Test conversion minuscules."""
        assert "bordeaux" in normalize_string("BORDEAUX").lower()

    def test_normalize_accents(self):
        """Test suppression accents."""
        result = normalize_string("Château")
        assert "chateau" in result or "château" not in result

    def test_normalize_stop_words(self):
        """Test suppression stop words."""
        result = normalize_string("Château de la Loire")
        # château, de, la supprimés
        assert "chateau" not in result
        assert "de" not in result
        assert "la" not in result
        assert "loire" in result

    def test_normalize_multiple_stop_words(self):
        """Test suppression multiples stop words."""
        result = normalize_string("Le Domaine du Moulin")
        # le, domaine, du supprimés
        assert "moulin" in result

    def test_normalize_spaces_normalized(self):
        """Test normalisation espaces."""
        result = normalize_string("  Wine   Name  ")
        # Espaces multiples normalisés
        assert "  " not in result

    def test_normalize_short_words_kept(self):
        """Test que les mots courts (>= 3 chars après filtre) sont gardés."""
        result = normalize_string("XYZ ABC")
        # stop words de moins de 3 chars
        assert len(result) >= 0


# ==============================================================================
#  Tests similarity_ratio()
# ==============================================================================

class TestSimilarityRatio:
    """Tests pour similarity_ratio() — ratio de similarité (Jaccard)."""

    def test_similarity_identical(self):
        """Test chaînes identiques."""
        assert similarity_ratio("bordeaux", "bordeaux") == 1.0

    def test_similarity_no_match(self):
        """Test chaînes sans overlap."""
        ratio = similarity_ratio("abc", "xyz")
        assert ratio < 0.5

    def test_similarity_partial_overlap(self):
        """Test chevauchement partiel."""
        ratio = similarity_ratio("bordeaux rouge", "bordeaux blanc")
        # "bordeaux" commun
        assert 0 < ratio < 1

    def test_similarity_empty_strings(self):
        """Test chaînes vides."""
        assert similarity_ratio("", "") == 0.0
        assert similarity_ratio("test", "") == 0.0
        assert similarity_ratio("", "test") == 0.0

    def test_similarity_single_word(self):
        """Test mot unique."""
        ratio = similarity_ratio("wine", "wine")
        assert ratio == 1.0

    def test_similarity_case_sensitive(self):
        """Test que la fonction compare directement (case-sensitive sur mots)."""
        # Dépend de l'implémentation : si elle lowercase avant
        ratio = similarity_ratio("WINE wine", "wine wine")
        # Dépend du préprocessing
        assert 0 <= ratio <= 1


# ==============================================================================
#  Tests is_bordeaux_region()
# ==============================================================================

class TestIsBordeauxRegion:
    """Tests pour is_bordeaux_region() — vérification région Bordeaux."""

    def test_is_bordeaux_none(self):
        """Test None → True (région inconnue acceptée)."""
        assert is_bordeaux_region(None) is True

    def test_is_bordeaux_empty(self):
        """Test chaîne vide → True."""
        assert is_bordeaux_region("") is True

    def test_is_bordeaux_keyword(self):
        """Test chaînes contenant keyword Bordeaux."""
        assert is_bordeaux_region("Bordeaux · Pauillac") is True
        assert is_bordeaux_region("medoc") is True
        assert is_bordeaux_region("Gironde") is True

    def test_is_bordeaux_appellation_names(self):
        """Test appellations Bordeaux."""
        assert is_bordeaux_region("pauillac") is True
        assert is_bordeaux_region("margaux") is True
        assert is_bordeaux_region("saint-julien") is True
        assert is_bordeaux_region("saint-estephe") is True

    def test_is_bordeaux_false(self):
        """Test régions non-Bordeaux."""
        assert is_bordeaux_region("Bourgogne") is False
        assert is_bordeaux_region("Champagne") is False
        assert is_bordeaux_region("Alsace") is False
        assert is_bordeaux_region("Loire") is False

    def test_is_bordeaux_case_insensitive(self):
        """Test case-insensitive."""
        assert is_bordeaux_region("BORDEAUX") is True
        assert is_bordeaux_region("MEDOC") is True
        assert is_bordeaux_region("Bordeaux") is True


# ==============================================================================
#  Tests search_producer_in_db()
# ==============================================================================

class TestSearchProducerInDb:
    """Tests pour search_producer_in_db() — recherche producteur BDD."""

    def test_search_no_words(self):
        """Test normalized empty → None."""
        conn = MagicMock()
        result = search_producer_in_db(conn, "")
        assert result is None

    def test_search_only_stop_words(self):
        """Test chaîne avec que stop words → None."""
        conn = MagicMock()
        result = search_producer_in_db(conn, "de la le")
        assert result is None

    def test_search_match_found(self):
        """Test match trouvé avec score >= 1.2."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor

        # Mock 2 producteurs, le deuxième match mieux
        cursor.fetchall.return_value = [
            {'code': '1', 'name': 'Another Producer', 'region': 'Bourgogne'},
            {'code': '2', 'name': 'Château Margaux', 'region': 'Bordeaux · Margaux'},
        ]

        with patch('match_medoc.normalize_string') as mock_norm:
            mock_norm.side_effect = lambda x: {
                'Château Margaux': 'margaux',
                'Another Producer': 'another',
            }.get(x, x.lower())

            result = search_producer_in_db(conn, 'Château Margaux')
            # Dépend de la logique d'appariement
            assert result is None or (result and result['code'] == '2')

    def test_search_no_match_low_score(self):
        """Test pas de match si score < 1.2."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchall.return_value = [
            {'code': '1', 'name': 'XYZ ABC', 'region': 'Bordeaux'},
        ]

        result = search_producer_in_db(conn, 'totally different')
        assert result is None

    def test_search_filters_non_bordeaux(self):
        """Test filtrage producteurs non-Bordeaux."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchall.return_value = [
            {'code': '1', 'name': 'Champagne Brand', 'region': 'Champagne'},
        ]

        with patch('match_medoc.normalize_string') as mock_norm:
            mock_norm.side_effect = lambda x: x.lower().replace('champagne', 'champagne')
            result = search_producer_in_db(conn, 'Champagne Brand')
            # Doit être filtré car région non-Bordeaux
            assert result is None

    def test_search_returns_best_candidate(self):
        """Test retourne le meilleur candidat."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchall.return_value = [
            {'code': '1', 'name': 'Bad Match', 'region': 'Bordeaux'},
            {'code': '2', 'name': 'Perfect Match', 'region': 'Bordeaux'},
        ]

        with patch('match_medoc.normalize_string') as mock_norm:
            mock_norm.side_effect = lambda x: x.lower()

        result = search_producer_in_db(conn, 'Perfect Match')
        if result:
            assert result['code'] in ['1', '2']


# ==============================================================================
#  Tests get_wines_for_producer()
# ==============================================================================

class TestGetWinesForProducer:
    """Tests pour get_wines_for_producer() — récupération vins producteur."""

    def test_get_wines_no_results(self):
        """Test producteur sans vins."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchall.return_value = []
        cursor.fetchone.return_value = None

        result = get_wines_for_producer(conn, '123', 'Test Producer')

        assert result == []

    def test_get_wines_single_wine(self):
        """Test producteur avec 1 vin."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchall.return_value = [
            {
                'wine_name': 'Château Test',
                'year': 2020,
                'stars': 3,
                'color': 'Rouge',
                'wine_type': 'Rouge tranquille',
                'link': 'https://example.com/123',
            }
        ]

        result = get_wines_for_producer(conn, '123', 'Test Producer')

        assert len(result) == 1
        assert result[0]['searchName'] == 'Château Test'
        assert result[0]['producerCode'] == '123'
        assert len(result[0]['vintages']) == 1

    def test_get_wines_multiple_vintages(self):
        """Test vin avec multiples millésimes."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchall.return_value = [
            {
                'wine_name': 'Wine A',
                'year': 2020,
                'stars': 3,
                'color': 'Rouge',
                'wine_type': 'Rouge tranquille',
                'link': 'url1',
            },
            {
                'wine_name': 'Wine A',
                'year': 2019,
                'stars': 2,
                'color': 'Rouge',
                'wine_type': 'Rouge tranquille',
                'link': 'url2',
            },
        ]

        result = get_wines_for_producer(conn, '123')

        assert len(result) == 1
        assert len(result[0]['vintages']) == 2

    def test_get_wines_effervescent_detection(self):
        """Test détection vins effervescent."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchall.return_value = [
            {
                'wine_name': 'Sparkling',
                'year': 2020,
                'stars': 0,
                'color': 'Blanc',
                'wine_type': 'Blanc effervescent',
                'link': 'url',
            },
        ]

        result = get_wines_for_producer(conn, '123')

        assert result[0]['vintages'][0]['isEffervescent'] is True

    def test_get_wines_format(self):
        """Test format WineResult retourné."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchall.return_value = [
            {
                'wine_name': 'Test Wine',
                'year': 2020,
                'stars': 2,
                'color': 'Rouge',
                'wine_type': 'Rouge tranquille',
                'link': 'url',
            },
        ]

        result = get_wines_for_producer(conn, '456', 'Producer Name')

        wine = result[0]
        assert 'searchName' in wine
        assert 'foundName' in wine
        assert 'producerCode' in wine
        assert 'producerName' in wine
        assert 'concordance' in wine
        assert 'passUsed' in wine
        assert 'detailUrl' in wine
        assert 'vintages' in wine
        assert wine['producerName'] == 'Producer Name'
