"""
test_scraper.py — Tests pour la fonction _parse_producer_listing_page() de scraper.py.

Attention : scraper.py importe from config import ... (mocké par conftest.py).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unittest.mock import MagicMock, patch
import pytest
from scraper import _parse_producer_listing_page


# ==============================================================================
#  Tests _parse_producer_listing_page()
# ==============================================================================

class TestParseProducerListingPage:
    """Tests pour _parse_producer_listing_page() — parsing page producteurs."""

    def test_parse_empty_html(self):
        """Test HTML vide."""
        assert _parse_producer_listing_page("") == []
        assert _parse_producer_listing_page(None) == []

    def test_parse_simple_link(self):
        """Test extraction simple : <a href='/producteurs/123/'>Name</a>."""
        html = '<a href="/producteurs/123/">Test Producer</a>'
        result = _parse_producer_listing_page(html)
        assert len(result) == 1
        code, name, url = result[0]
        assert code == "123"
        assert name == "Test Producer"
        assert "123" in url

    def test_parse_code_via_code_producteur(self):
        """Test extraction code via code_producteur=456."""
        html = '<a href="?code_producteur=456">Another Producer</a>'
        result = _parse_producer_listing_page(html)
        assert len(result) == 1
        assert result[0][0] == "456"

    def test_parse_no_code_extracted(self):
        """Test lien sans code → skippé."""
        html = '<a href="/some/page/">No Code Here</a>'
        result = _parse_producer_listing_page(html)
        assert result == []

    def test_parse_no_name_extracted(self):
        """Test lien sans nom → skippé."""
        html = '<a href="/producteurs/123/"></a>'
        result = _parse_producer_listing_page(html)
        assert result == []

    def test_parse_short_name(self):
        """Test nom trop court (< 2 chars) → skippé."""
        html = '<a href="/producteurs/123/">X</a>'
        result = _parse_producer_listing_page(html)
        assert result == []

    def test_parse_absolute_url(self):
        """Test URL absolue retournée telle quelle."""
        html = '<a href="https://www.hachette-vins.com/producteurs/789/">Test</a>'
        result = _parse_producer_listing_page(html)
        assert len(result) == 1
        assert result[0][2].startswith('https://')

    def test_parse_relative_url_completed(self):
        """Test URL relative → complétée avec https://www.hachette-vins.com."""
        html = '<a href="/producteurs/456/">Producer</a>'
        result = _parse_producer_listing_page(html)
        assert len(result) == 1
        url = result[0][2]
        assert url.startswith('https://www.hachette-vins.com')

    def test_parse_multiple_links(self):
        """Test parsing multiples liens."""
        html = (
            '<a href="/producteurs/111/">First</a>'
            '<a href="/producteurs/222/">Second</a>'
            '<a href="/producteurs/333/">Third</a>'
        )
        result = _parse_producer_listing_page(html)
        assert len(result) == 3
        codes = [r[0] for r in result]
        assert "111" in codes
        assert "222" in codes
        assert "333" in codes

    def test_parse_duplicates_removed(self):
        """Test suppression doublons (même code)."""
        html = (
            '<a href="/producteurs/123/">First</a>'
            '<a href="/producteurs/123/">Second</a>'
        )
        result = _parse_producer_listing_page(html)
        assert len(result) == 1

    def test_parse_name_with_pipe_separator(self):
        """Test nom avec '|' → texte avant pipe conservé."""
        html = '<a href="/producteurs/123/">Producer Name | Info</a>'
        result = _parse_producer_listing_page(html)
        assert len(result) == 1
        name = result[0][1]
        assert "Producer Name" in name
        # Le '| Info' doit être supprimé
        assert "|" not in name or "Info" not in name

    def test_parse_name_spaces_normalized(self):
        """Test normalisation espaces multiples dans nom."""
        html = '<a href="/producteurs/123/">Producer   Name   Here</a>'
        result = _parse_producer_listing_page(html)
        assert len(result) == 1
        name = result[0][1]
        # Espaces multiples normalisés
        assert "  " not in name

    def test_parse_code_variants(self):
        """Test extraction codes variantes."""
        html = (
            '<a href="/producteurs/code_producteur/111/">A</a>'
            '<a href="/producteurs/222/">B</a>'
            '<a href="/producteur/code_producteur=333/">C</a>'
        )
        result = _parse_producer_listing_page(html)
        codes = [r[0] for r in result]
        # La regex /producteu[rs]+/ match producteur(s)
        # code_producteur= aussi
        assert len(codes) >= 1

    def test_parse_empty_link_text(self):
        """Test lien avec texte vide après normalisation."""
        html = '<a href="/producteurs/123/">   </a>'
        result = _parse_producer_listing_page(html)
        # Texte vide après strip → skippé
        assert result == []

    def test_parse_no_href(self):
        """Test lien sans href → skippé."""
        html = '<a>Producer Name</a>'
        result = _parse_producer_listing_page(html)
        assert result == []

    def test_parse_hash_link(self):
        """Test lien '#' sans code → skippé."""
        html = '<a href="#">Producer</a>'
        result = _parse_producer_listing_page(html)
        assert result == []

    def test_parse_result_structure(self):
        """Test structure (code, name, url) du résultat."""
        html = '<a href="/producteurs/123/">Test Producer</a>'
        result = _parse_producer_listing_page(html)
        assert len(result) == 1
        assert len(result[0]) == 3
        code, name, url = result[0]
        assert isinstance(code, str)
        assert isinstance(name, str)
        assert isinstance(url, str)
        assert code == "123"
        assert name == "Test Producer"
