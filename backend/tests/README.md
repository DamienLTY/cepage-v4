# Tests Jest — Backend Cépage V5

Répertoire des tests automatisés pour le backend Node.js/Express.

## Fichiers

### Configuration

- **jest.config.js** (racine) — Configuration Jest globale
- **../TESTS.md** — Documentation complète des tests

### Helpers

- **helpers/mockPrisma.js** — Mock Prisma complet pour tous les tests (user, vintage, producer, emailToken, userFavorite, wineDetail)

### Tests Unitaires (`unit/`)

| Fichier | Fonction | Tests | Statut |
|---------|----------|-------|--------|
| **jwt.test.js** | `signToken()`, `formatUser()` | 5 tests | ✅ |
| **wineSearch.normalize.test.js** | `normalize()` (minuscule, accents, spaces) | 9 tests | ✅ |
| **auth.middleware.test.js** | `requireAuth()`, `requireAdmin()` | 10 tests | ✅ |

**Total unitaires** : 24 tests

### Tests d'Intégration (`integration/`)

| Fichier | Routes | Tests | Statut |
|---------|--------|-------|--------|
| **search.routes.test.js** | `/api/search`, `/api/producer`, `/api/region` | 10 tests | ✅ |
| **status.routes.test.js** | `/`, `/api/status`, `/api/test-connection` | 6 tests | ✅ |
| **wine.routes.test.js** | `/api/wine/detail`, `/api/wine/:code`, `/api/admin/fix-colors`, `/api/admin/color-conflicts` | 12 tests | ✅ |

**Total intégration** : 28 tests

**Grand total** : **52 tests**

## Exécution

```bash
# Depuis le répertoire backend
npm test

# Avec couverture
npm run test:coverage

# Tests spécifiques
npm test -- tests/unit/jwt.test.js
npm test -- tests/integration/
```

## Couverture

- **Seuil global** : 60% des lignes
- **Fichiers couverts** : `src/**/*.js`
- **Rapport** : `coverage/` (HTML après `npm run test:coverage`)

## Architecture

```
tests/
├── helpers/
│   └── mockPrisma.js          Mock Prisma reutilisable
├── unit/
│   ├── jwt.test.js            Utilitaires JWT
│   ├── wineSearch.normalize.test.js  Normalisation texte
│   └── auth.middleware.test.js  Middlewares auth
└── integration/
    ├── search.routes.test.js  Routes de recherche
    ├── status.routes.test.js  Routes statut
    └── wine.routes.test.js    Routes vins + admin
```

## Conventions

- **Setup** : `beforeEach(() => jest.clearAllMocks())`
- **Mocks Prisma** : via `jest.mock()` + helpers/mockPrisma
- **Routes** : `supertest(app)` avec mini-app Express
- **Auth** : tokens JWT avec `jwt.sign()` + mock Prisma

## Prochaines extensions possibles

- [ ] Routes `/api/auth/*` (register, login, email verification, password reset)
- [ ] Routes `/api/visite/*` (balade mode exposants)
- [ ] Routes `/api/admin/events/*` (gestion événements)
- [ ] Tests de performance (10k+ recherches)
- [ ] Tests de sécurité (SQL injection, XSS, rate limiting)

