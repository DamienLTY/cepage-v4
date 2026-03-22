# Index complet — Suite Jest Cépage V5

## Chemins absolus des fichiers créés

### Configuration
```
C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\
├── jest.config.js
└── package.json (modifié)
```

### Tests — Structure complète
```
tests/
├── helpers/
│   └── mockPrisma.js                    # Mock Prisma (reutilisable)
├── unit/
│   ├── jwt.test.js                      # Tests JWT (5 tests)
│   ├── auth.middleware.test.js          # Tests auth (10 tests)
│   └── wineSearch.normalize.test.js     # Tests normalisation (9 tests)
├── integration/
│   ├── search.routes.test.js            # Tests routes search (10 tests)
│   ├── status.routes.test.js            # Tests routes status (6 tests)
│   └── wine.routes.test.js              # Tests routes wine (12 tests)
└── README.md                            # Index des tests
```

### Documentation
```
├── TESTS.md                             # Doc complète (8.5 KB)
├── QUICK_START_TESTS.md                 # Quick start (1.8 KB)
├── JEST_SETUP_SUMMARY.txt               # Résumé setup (6.2 KB)
├── FILE_MANIFEST.txt                    # Manifest fichiers
└── INDEX_TESTS.md                       # Cet index
```

---

## Accès rapide par catégorie

### 📖 Documentation

| Fichier | Pour qui ? | Temps |
|---------|-----------|-------|
| **QUICK_START_TESTS.md** | Utilisateur impatient | 2 min |
| **TESTS.md** | Développeur complet | 10 min |
| **JEST_SETUP_SUMMARY.txt** | Révision complète | 5 min |
| **FILE_MANIFEST.txt** | Vue d'ensemble fichiers | 3 min |
| **tests/README.md** | Index des tests | 2 min |

### 🧪 Tests unitaires (24 tests)

| Fichier | Tests | Focus |
|---------|-------|-------|
| **jwt.test.js** | 5 | Token generation, user formatting |
| **auth.middleware.test.js** | 10 | Authentication, authorization (401, 403) |
| **wineSearch.normalize.test.js** | 9 | Text normalization (accents, case, spaces) |

### 🚀 Tests d'intégration (28 tests)

| Fichier | Routes | Tests |
|---------|--------|-------|
| **search.routes.test.js** | /api/search, /producer, /region | 10 |
| **status.routes.test.js** | /, /api/status, /test-connection | 6 |
| **wine.routes.test.js** | /wine/*, /admin/* | 12 |

### 🔧 Helpers & Mocks

| Fichier | Utilité |
|---------|---------|
| **mockPrisma.js** | Mock Prisma pour TOUS les tests |

---

## Chemins complets des fichiers

### Configuration

- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\jest.config.js`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\package.json`

### Tests unitaires

- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\tests\unit\jwt.test.js`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\tests\unit\auth.middleware.test.js`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\tests\unit\wineSearch.normalize.test.js`

### Tests d'intégration

- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\tests\integration\search.routes.test.js`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\tests\integration\status.routes.test.js`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\tests\integration\wine.routes.test.js`

### Helpers & Mocks

- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\tests\helpers\mockPrisma.js`

### Documentation

- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\tests\README.md`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\TESTS.md`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\QUICK_START_TESTS.md`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\JEST_SETUP_SUMMARY.txt`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\FILE_MANIFEST.txt`
- `C:\Users\damie\CLAUDE CODE\CEPAGE V5\3. SITE WEB HACHETTE V5\backend\INDEX_TESTS.md` (cet index)

---

## Commandes rapides

```bash
# Depuis le répertoire backend
cd "3. SITE WEB HACHETTE V5/backend"

# Installation (première fois)
npm install

# Exécuter tous les tests
npm test

# Avec rapport de couverture
npm run test:coverage

# Tests spécifiques
npm test -- tests/unit/jwt.test.js
npm test -- tests/integration/
```

---

## Résumé statistique

- **52 tests** (24 unit + 28 integration)
- **6 fichiers test** (.test.js)
- **1 helper** (mockPrisma.js)
- **1 config** (jest.config.js)
- **5 docs** (markdown + txt)
- **Aucune DB requise** (tous les mocks)
- **Temps exécution** : < 10 secondes

---

## Flux recommandé

1. **Lire** : QUICK_START_TESTS.md (2 min)
2. **Installer** : `npm install` (1 min)
3. **Exécuter** : `npm test` (< 10s)
4. **Explorer** : Consulter TESTS.md ou tests/README.md selon le besoin

---

## Support supplémentaire

- Questions sur les mocks ? → `tests/helpers/mockPrisma.js`
- Questions sur un test ? → Consulter le fichier test correspondant
- Comprendre l'architecture ? → `TESTS.md` section "Architecture des mocks"
- Ajouter des tests ? → Suivre les conventions dans `tests/README.md`

---

**Créé** : Mars 2026
**Backend** : Node.js 18+ · Express 4.21 · Prisma 5.22
