# Tests pytest — Scripts Python de scraping

## Vue d'ensemble

Suite de tests pytest complète pour les scripts Python de scraping du projet Cépage V5 :
- `db_pg.py` — Adaptateur PostgreSQL
- `scrape_medoc.py` — Scraper Portes Ouvertes Médoc
- `match_medoc.py` — Matching BDD exposants Médoc
- `scrape_exposants.py` — Scraper Vignerons Indépendants
- `fetcher.py` — Récupération HTTP et parsing HTML
- `scraper.py` — Parser page producteurs

## Structure des tests

```
tests_py/
├── __init__.py                  # Vide (permet pytest de découvrir le package)
├── conftest.py                  # Fixtures pytest et mocks config
├── test_db_pg.py               # Tests db_pg.normalize(), PGCursor, PGConnection
├── test_scrape_medoc.py        # Tests clean_text(), extract_section_content()
├── test_match_medoc.py         # Tests normalize_string(), similarity_ratio()
├── test_scrape_exposants.py    # Tests normalize_string(), similarity_ratio(), sort_stands()
├── test_fetcher.py             # Tests extract_all_producer_codes(), parse_wine_blocks()
├── test_scraper.py             # Tests _parse_producer_listing_page()
└── README.md                    # Ce fichier
```

## Lancer les tests

### Tous les tests
```bash
cd backend
python -m pytest tests_py/ -v
```

### Un fichier de test spécifique
```bash
python -m pytest tests_py/test_db_pg.py -v
python -m pytest tests_py/test_match_medoc.py -v
```

### Une classe de test
```bash
python -m pytest tests_py/test_db_pg.py::TestNormalize -v
```

### Un test individuel
```bash
python -m pytest tests_py/test_db_pg.py::TestNormalize::test_normalize_simple -v
```

## Couverture des tests

### test_db_pg.py (19 tests ✓)
- `TestNormalize` : 6 tests pour `normalize()`
- `TestGetDb` : 2 tests pour `get_db()`
- `TestPGCursor` : 6 tests pour classe PGCursor
- `TestPGConnection` : 5 tests pour classe PGConnection

### test_scrape_medoc.py (8+ tests)
- `TestCleanText` : 7 tests pour `clean_text()`
- `TestGetAppellationKey` : 6 tests pour `get_appellation_key()`
- `TestExtractSectionContent` : 7 tests pour `extract_section_content()`
- `TestGetChateauUrls` : 8 tests pour `get_chateau_urls()`

### test_match_medoc.py (25+ tests)
- `TestNormalizeString` : 7 tests pour `normalize_string()`
- `TestSimilarityRatio` : 6 tests pour `similarity_ratio()`
- `TestIsBordeauxRegion` : 6 tests pour `is_bordeaux_region()`
- `TestSearchProducerInDb` : 6 tests pour `search_producer_in_db()` (avec mocks)
- `TestGetWinesForProducer` : 6 tests pour `get_wines_for_producer()` (avec mocks)

### test_scrape_exposants.py (24+ tests)
- `TestNormalizeStringExposants` : 8 tests pour `normalize_string()`
- `TestSimilarityRatioExposants` : 5 tests pour `similarity_ratio()`
- `TestSortStands` : 7 tests pour `sort_stands()`

### test_fetcher.py (20+ tests)
- `TestExtractAllProducerCodes` : 8 tests pour `extract_all_producer_codes()`
- `TestParseWineBlocks` : 14 tests pour `parse_wine_blocks()`

### test_scraper.py (14 tests)
- `TestParseProducerListingPage` : 14 tests pour `_parse_producer_listing_page()`

**Total : ~130+ tests** couvrant les fonctions pures des scripts de scraping.

## Mocking et fixtures

### conftest.py

Fournit les mocks et fixtures communes :

- `mock_conn` — Connexion PostgreSQL/SQLite mockée
- `mock_db_factory` — Patch `db_pg.get_db()` pour retourner `mock_conn`
- `sample_wine_row` — Exemple rangée vin depuis BDD
- `sample_producer_row` — Exemple rangée producteur depuis BDD

Mock du module `config` (qui n'existe plus après migration Node.js) :
```python
config_mock.BASE_URL = 'https://www.hachette-vins.com'
config_mock.ANNEE_MIN = 1990
config_mock.SCRAPLING_OK = False
```

## Cas de test clés

### Normalisation (db_pg, match_medoc, scrape_exposants)
- Accents supprimés ✓
- Casse normalisée ✓
- Espaces nettoyés ✓
- Stop words supprimés (pour match_medoc, scrape_exposants) ✓

### Extraction HTML (scrape_medoc, fetcher, scraper)
- Balises supprimées ✓
- Entités HTML décodées ✓
- Patterns regex appliqués ✓
- URLs extraites sans doublons ✓

### Matching BDD (match_medoc, scrape_exposants)
- Score similarité >= 1.2 pour valider match ✓
- Filtrage par région Bordeaux ✓
- Retour candidat meilleur match ✓

### Parsing blocs vin (fetcher)
- Stars cappées à 3 ✓
- Détection effervescent ✓
- Couleurs extraites (Rouge, Blanc, Rosé) ✓
- Année hors plage → skip ✓

## Notes importantes

1. **Pas de BDD réelle** — Tous les tests utilisent des mocks (unittest.mock.MagicMock)
2. **Pas d'HTTP réel** — Les tests ne font pas de requêtes réseau
3. **Fonctions pures uniquement** — Tests focalisés sur les fonctions sans I/O
4. **Config mockée** — Le module `config` (qui n'existe plus) est mocké dans conftest.py

## Troubleshooting

### Erreur : "No module named 'config'"
C'est normal et attendu. Le conftest.py mock ce module.

### Erreur : "DATABASE_URL not defined"
Attendu pour les tests `get_db()`. Utilisez le fixture `mock_db_factory`.

### Imports de scripts Python avec reconfiguration stdout
Certains scripts (scrape_exposants.py) reconfiguren sys.argv/stdout au niveau module.
Le conftest isole ça via `sys.modules['config']` mock.

## Amélioration future

- Ajouter des tests d'intégration (avec BDD réelle)
- Ajouter des tests de scraping simulés (mock HTTP responses)
- Mesurer la couverture (coverage report)
- Ajouter des tests de performance (benchmarks)
