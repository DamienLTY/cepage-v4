# Quick Start — Tests Jest

Suite de tests complète pour le backend Node.js/Express créée en mars 2026.

## Installation (5 min)

```bash
cd "3. SITE WEB HACHETTE V5/backend"
npm install
```

Cela installe :
- **jest** ^29.0.0 — Framework de test
- **supertest** ^7.0.0 — HTTP testing pour Express

## Exécuter les tests (< 10s)

```bash
# Tous les tests
npm test

# Avec rapport de couverture
npm run test:coverage

# Tests spécifiques
npm test -- tests/unit/jwt.test.js
npm test -- tests/integration/
```

## Résultat attendu

```
PASS  tests/unit/jwt.test.js
PASS  tests/unit/auth.middleware.test.js
PASS  tests/unit/wineSearch.normalize.test.js
PASS  tests/integration/search.routes.test.js
PASS  tests/integration/status.routes.test.js
PASS  tests/integration/wine.routes.test.js

Test Suites: 6 passed, 6 total
Tests:       52 passed, 52 total
Snapshots:   0 total
Time:        X.XXs
```

## Fichiers clés

| Fichier | Contenu |
|---------|---------|
| `jest.config.js` | Configuration Jest |
| `tests/helpers/mockPrisma.js` | Mock Prisma (utilisé par tous les tests) |
| `tests/unit/*.test.js` | 3 fichiers — JWT, normalisation, auth middleware |
| `tests/integration/*.test.js` | 3 fichiers — 10+ routes testées |
| `TESTS.md` | Documentation complète |
| `tests/README.md` | Index des tests |

## 52 Tests

### Unit (24)
- **jwt.test.js** (5) — signToken, formatUser
- **wineSearch.normalize.test.js** (9) — accent removal, case normalization
- **auth.middleware.test.js** (10) — requireAuth, requireAdmin

### Integration (28)
- **search.routes.test.js** (10) — /api/search, /api/producer, /api/region
- **status.routes.test.js** (6) — /, /api/status, /api/test-connection
- **wine.routes.test.js** (12) — /api/wine/*, /api/admin/*

## Important

✅ **Aucune vraie DB requise** — tous les tests utilisent des mocks Jest
✅ **DATABASE_URL non requis** — peut rester vide
✅ **Exécution rapide** — ~5-10 secondes pour 52 tests
✅ **Zéro dépendances externes** — juste npm install

## Exemple de test

```javascript
// tests/unit/jwt.test.js
it('should create a valid JWT with correct payload', () => {
  const user = { id: 'user-123', email: 'test@example.com', role: 'admin' };
  const token = signToken(user);

  expect(token).toBeDefined();
  const decoded = jwt.verify(token, config.JWT_SECRET);
  expect(decoded.sub).toBe('user-123');
  expect(decoded.role).toBe('admin');
});
```

## Couverture

- **Seuil global** : 60% des lignes
- **Modules bien couverts** :
  - ✅ jwt.js (100%)
  - ✅ auth.middleware.js (100%)
  - ✅ search.routes.js (100%)
  - ✅ status.routes.js (100%)
  - ⚠️ wine.routes.js (70%)
  - ⚠️ wineSearch.js (30% — normalize testé)

## Prochaines extensions

- [ ] Routes `/api/auth/*` (register, login, etc.)
- [ ] Routes `/api/visite/*` (balade mode)
- [ ] Routes `/api/admin/events/*`
- [ ] Tests de performance
- [ ] Tests de sécurité

## Aide

- **Documentation complète** → `TESTS.md`
- **Index des tests** → `tests/README.md`
- **Résumé du setup** → `JEST_SETUP_SUMMARY.txt`

---

**Créé** : Mars 2026
**Backend** : Node.js 18+ · Express 4.21 · Prisma 5.22
