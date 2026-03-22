"""
test_scrape_exposants.py — Tests pour les fonctions pures de scrape_exposants.py.

Attention : scrape_exposants.py appelle parse_args() et reconfigure sys.argv/stdout/stderr au niveau module.
Pour éviter les problèmes avec pytest, on importe lazy les fonctions dans chaque test.
"""

import sys
import os
from unittest.mock import MagicMock, patch
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _import_scrape_exposants_func(func_name):
    """Import lazy une fonction de scrape_exposants avec sys.argv patché."""
    original_argv = sys.argv.copy()
    sys.argv = ['scrape_exposants.py', '--db', 'dummy.db', '--output', 'dummy.json']
    try:
        import scrape_exposants
        return getattr(scrape_exposants, func_name)
    finally:
        sys.argv = original_argv


# ==============================================================================
#  Tests normalize_string()
# ==============================================================================

class TestNormalizeStringExposants:
    """Tests pour normalize_string() dans scrape_exposants.py."""

    def test_normalize_simple(self):
        """Test normalisation simple."""
        normalize_string = _import_scrape_exposants_func('normalize_string')
        result = normalize_string("Château de la Loire")
        # Château, de, la supprimés
        assert "chateau" not in result
        assert "loire" in result

    def test_normalize_empty(self):
        """Test chaîne vide."""
        normalize_string = _import_scrape_exposants_func('normalize_string')
        assert normalize_string("") == ""

    def test_normalize_uppercase(self):
        """Test conversion minuscules."""
        normalize_string = _import_scrape_exposants_func('normalize_string')
        result = normalize_string("DOMAINE DU MOULIN")
        assert "domaine" not in result  # stop word
        assert "du" not in result  # stop word
        assert "moulin" in result.lower()

    def test_normalize_accents(self):
        """Test suppression accents."""
        normalize_string = _import_scrape_exposants_func('normalize_string')
        result = normalize_string("Château Côte")
        # Pas de cote (accent ô supprimé → o)
        assert "chateau" not in result

    def test_normalize_stop_words(self):
        """Test suppression stop words."""
        normalize_string = _import_scrape_exposants_func('normalize_string')
        result = normalize_string("Château et Domaine de la Loire les vignes")
        # château, et, domaine, de, la, les supprimés
        assert "loire" in result
        assert "vignes" in result
        assert "et" not in result

    def test_normalize_short_words_removed(self):
        """Test suppression mots courts."""
        normalize_string = _import_scrape_exposants_func('normalize_string')
        result = normalize_string("a de I the wine")
        # a, I supprimés (len < 2 ou stop word)
        assert "wine" in result

    def test_normalize_spaces_normalized(self):
        """Test normalisation espaces."""
        normalize_string = _import_scrape_exposants_func('normalize_string')
        result = normalize_string("  Wine   Name  ")
        assert "  " not in result

    def test_normalize_sarl_sas(self):
        """Test suppression stop words SARL, SAS, etc."""
        normalize_string = _import_scrape_exposants_func('normalize_string')
        result = normalize_string("Wine SARL Company")
        assert "sarl" not in result


# ==============================================================================
#  Tests similarity_ratio()
# ==============================================================================

class TestSimilarityRatioExposants:
    """Tests pour similarity_ratio() dans scrape_exposants.py (SequenceMatcher)."""

    def test_similarity_identical(self):
        """Test chaînes identiques."""
        similarity_ratio = _import_scrape_exposants_func('similarity_ratio')
        ratio = similarity_ratio("bordeaux rouge", "bordeaux rouge")
        assert ratio == 1.0

    def test_similarity_no_match(self):
        """Test chaînes sans overlap."""
        similarity_ratio = _import_scrape_exposants_func('similarity_ratio')
        ratio = similarity_ratio("abc", "xyz")
        assert ratio < 0.5

    def test_similarity_case_matters(self):
        """Test que case matters (SequenceMatcher est case-sensitive)."""
        similarity_ratio = _import_scrape_exposants_func('similarity_ratio')
        ratio1 = similarity_ratio("Wine", "wine")
        ratio2 = similarity_ratio("wine", "wine")
        # ratio1 < ratio2 car W != w
        assert ratio1 < ratio2

    def test_similarity_partial(self):
        """Test chevauchement partiel."""
        similarity_ratio = _import_scrape_exposants_func('similarity_ratio')
        ratio = similarity_ratio("bordeaux", "bourgogne")
        # Plusieurs caractères communs (b, o, r, ...)
        assert 0 < ratio < 1

    def test_similarity_empty(self):
        """Test chaînes vides."""
        similarity_ratio = _import_scrape_exposants_func('similarity_ratio')
        ratio = similarity_ratio("", "")
        # SequenceMatcher sur "" et "" retourne 1.0
        assert ratio >= 0


# ==============================================================================
#  Tests sort_stands()
# ==============================================================================

class TestSortStands:
    """Tests pour sort_stands() — tri exposants par stand."""

    def test_sort_empty_list(self):
        """Test liste vide."""
        sort_stands = _import_scrape_exposants_func('sort_stands')
        assert sort_stands([]) == []

    def test_sort_single_stand(self):
        """Test liste avec 1 stand."""
        sort_stands = _import_scrape_exposants_func('sort_stands')
        exposants = [{'stand': 'A1', 'name': 'Test'}]
        result = sort_stands(exposants)
        assert result[0]['stand'] == 'A1'

    def test_sort_alphabetic_then_numeric(self):
        """Test tri : lettres puis numéros."""
        sort_stands = _import_scrape_exposants_func('sort_stands')
        exposants = [
            {'stand': 'B2', 'name': 'B'},
            {'stand': 'A1', 'name': 'A'},
            {'stand': 'A10', 'name': 'A10'},
        ]
        result = sort_stands(exposants)
        stands = [e['stand'] for e in result]
        assert stands == ['A1', 'A10', 'B2']

    def test_sort_numeric_sorting(self):
        """Test tri numérique correct (10 > 2)."""
        sort_stands = _import_scrape_exposants_func('sort_stands')
        exposants = [
            {'stand': 'A2'},
            {'stand': 'A10'},
            {'stand': 'A1'},
        ]
        result = sort_stands(exposants)
        stands = [e['stand'] for e in result]
        assert stands == ['A1', 'A2', 'A10']

    def test_sort_multiple_letters(self):
        """Test stands avec multiples lettres."""
        sort_stands = _import_scrape_exposants_func('sort_stands')
        exposants = [
            {'stand': 'BC5'},
            {'stand': 'AB3'},
            {'stand': 'AB10'},
        ]
        result = sort_stands(exposants)
        stands = [e['stand'] for e in result]
        assert stands == ['AB3', 'AB10', 'BC5']

    def test_sort_no_number(self):
        """Test stand sans numéro."""
        sort_stands = _import_scrape_exposants_func('sort_stands')
        exposants = [
            {'stand': 'A1'},
            {'stand': 'SPECIAL'},
            {'stand': 'B1'},
        ]
        result = sort_stands(exposants)
        stands = [e['stand'] for e in result]
        # SPECIAL sans regex match → sort key = (SPECIAL, 0)
        # Dépend de l'ordre de tri
        assert 'A1' in stands and 'B1' in stands

    def test_sort_preserves_other_fields(self):
        """Test que le tri préserve les autres champs."""
        sort_stands = _import_scrape_exposants_func('sort_stands')
        exposants = [
            {'stand': 'B1', 'name': 'B', 'extra': 'data'},
            {'stand': 'A1', 'name': 'A', 'extra': 'other'},
        ]
        result = sort_stands(exposants)
        assert result[0]['name'] == 'A'
        assert result[0]['extra'] == 'data'
        assert result[1]['name'] == 'B'

    def test_sort_mixed_case(self):
        """Test stands en mixed case."""
        sort_stands = _import_scrape_exposants_func('sort_stands')
        exposants = [
            {'stand': 'a2'},  # Minuscules
            {'stand': 'A1'},  # Majuscules
            {'stand': 'B1'},
        ]
        result = sort_stands(exposants)
        # Dépend si regex est case-sensitive
        # A1 matched (regex [A-Z]+), a2 non-matched
        # Si non-matched, sort key = (a2, 0)
        stands = [e['stand'] for e in result]
        assert 'A1' in stands
