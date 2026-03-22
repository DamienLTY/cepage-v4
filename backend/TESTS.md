# Jest Test Suite — Cépage V5 Backend

Suite de tests Jest complète pour le backend Node.js/Express (migration post-Flask).

## Structure

```
tests/
├── helpers/
│   └── mockPrisma.js           — Mock Prisma complet avec toutes les méthodes
├── unit/
│   ├── jwt.test.js             — Tests signToken() et formatUser()
│   ├── wineSearch.normalize.test.js  — Tests fonction normalize()
│   └── auth.middleware.test.js  — Tests requireAuth() et requireAdmin()
└── integration/
    ├── search.routes.test.js    — Tests GET /api/search, /api/producer, /api/region
    ├── status.routes.test.js    — Tests GET /, /api/status, /api/test-connection
    └── wine.routes.test.js      — Tests GET /api/wine/*, POST /api/admin/*
```

## Installation

```bash
npm install
```

Les dépendances de test suivantes seront installées :
- **jest** : ^29.0.0 — Framework de test
- **supertest** : ^7.0.0 — Agent HTTP pour tester les routes Express

## Exécution

### Tous les tests
```bash
npm test
```

### Avec couverture
```bash
npm run test:coverage
```

### Tests spécifiques
```bash
# Tests unitaires uniquement
node node_modules/.bin/jest tests/unit/

# Tests d'intégration uniquement
node node_modules/.bin/jest tests/integration/

# Test un fichier spécifique
node node_modules/.bin/jest tests/unit/jwt.test.js
```

## Couverture

Configuration seuil dans `jest.config.js` :
- **Lignes** : minimum 60%

Rapport de couverture :
```bash
npm run test:coverage
```

Génère un rapport HTML dans `coverage/` avec détails par fichier.

## Tests Unitaires

### `jwt.test.js`
- ✅ `signToken()` crée un JWT valide avec le bon payload (sub, email, role)
- ✅ JWT expire dans ~30 jours
- ✅ JWT non verifiable avec mauvaise clé secrète
- ✅ `formatUser()` omet passwordHash
- ✅ Tous les champs utilisateur mappés correctement

### `wineSearch.normalize.test.js`
- ✅ Conversion minuscule : `BORDEAUX` → `bordeaux`
- ✅ Suppression accents : `été` → `ete`, `Château` → `chateau`
- ✅ Suppression caractères non-alphanumériques (sauf espaces)
- ✅ Espaces multiples normalisés en simple
- ✅ Trim leading/trailing spaces
- ✅ Gère null/undefined → chaîne vide
- ✅ Exemples réalistes : noms château, régions viticoles

### `auth.middleware.test.js`
- ✅ `requireAuth` : 401 si pas de header Authorization
- ✅ `requireAuth` : 401 si pas de "Bearer "
- ✅ `requireAuth` : 401 si token invalide
- ✅ `requireAuth` : 401 si user introuvable en DB
- ✅ `requireAuth` : attache `req.user` et appelle `next()` si valide
- ✅ `requireAuth` : gère tokens expirés
- ✅ `requireAdmin` : 403 si pas de `req.user`
- ✅ `requireAdmin` : 403 si `role !== 'admin'`
- ✅ `requireAdmin` : appelle `next()` si admin

## Tests d'Intégration

### `search.routes.test.js`
- ✅ `GET /api/search` : 400 si paramètre `q` absent/vide
- ✅ `GET /api/search` : 200 avec structure `{ ok, results, total }`
- ✅ Clampement limit : [1-100]
- ✅ `GET /api/producer` : 400 si paramètre `q` absent
- ✅ `GET /api/producer` : 200 avec pagination `{ results, total, page, pages }`
- ✅ Calcul pages correct : 150 résultats × 50/page = 3 pages
- ✅ `GET /api/region` : 400 si paramètre `r` absent
- ✅ `GET /api/region` : 200 avec pagination
- ✅ Clampement page : minimum 1
- ✅ Respect du paramètre limit

### `status.routes.test.js`
- ✅ `GET /` : 200 avec `service`, `version`, `runtime`, `db_stats`, `endpoints`
- ✅ `GET /` : inclut counts producteurs/millesimes si DB OK
- ✅ `GET /` : gère erreur DB gracieusement (db_stats = {})
- ✅ `GET /api/status` : 200 avec `ok: true`, `db_ok: true/false`
- ✅ `GET /api/status` : `db_ok: false` si DB inaccessible
- ✅ `GET /api/test-connection` : 200 avec indicators (html_size, response_time, status)
- ✅ `GET /api/test-connection` : `ok: false` si connexion échoue

### `wine.routes.test.js`
- ✅ `GET /api/wine/detail` : 400 si URL manquante/invalide
- ✅ `GET /api/wine/detail` : 400 si URL non-Hachette
- ✅ `GET /api/wine/detail` : appelle scraper si URL valide
- ✅ `GET /api/wine/detail` : 502 si scraping échoue
- ✅ `GET /api/wine/:producerCode` : 200 avec `{ ok, producer, vintages }`
- ✅ `GET /api/wine/:producerCode` : 404 si producteur inexistant
- ✅ `GET /api/wine/:producerCode` : gère erreurs DB
- ✅ `POST /api/admin/fix-colors` : 401 si pas de token
- ✅ `POST /api/admin/fix-colors` : 403 si user non-admin
- ✅ `POST /api/admin/fix-colors` : 200 avec `{ ok, checked, fixed, errors }` si admin
- ✅ `GET /api/admin/color-conflicts` : 401 si pas de token
- ✅ `GET /api/admin/color-conflicts` : 403 si user non-admin
- ✅ `GET /api/admin/color-conflicts` : 200 avec conflicts list si admin

## Mocks

### `mockPrisma.js`
Mock complet de `src/lib/prisma` avec toutes les méthodes Prisma mockées via `jest.fn()` :

```javascript
{
  user: { findUnique, create, update, findMany, delete, count },
  vintage: { findMany, updateMany, deleteMany, count },
  producer: { findUnique, findMany, count },
  emailToken: { create, findUnique, update, deleteMany },
  userFavorite: { upsert, findMany, delete, createMany },
  wineDetail: { findMany, upsert },
  $queryRaw, $executeRaw
}
```

**Utilisation dans les tests** :
```javascript
jest.mock('../../src/lib/prisma', () => require('../helpers/mockPrisma'));
const { prismaMock } = require('../helpers/mockPrisma');

// Dans beforeEach
jest.clearAllMocks();

// Dans les tests
prismaMock.user.findUnique.mockResolvedValue({ ... });
```

## Configuration Jest

### `jest.config.js`
```javascript
{
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: { global: { lines: 60 } }
}
```

- **testEnvironment** : `node` (pas de DOM/browser)
- **testMatch** : cherche `*.test.js` dans `tests/`
- **collectCoverageFrom** : analyse `src/**/*.js`
- **coverageThreshold** : minimum 60% de ligne couvertes

## Points importants

### Routes asynchrones
Les routes dans `src/routes/search.js` appellent les fonctions async **sans await** :
```javascript
router.get('/search', (req, res) => {  // pas async
  const results = searchWinesDb(q, limit);  // retourne une Promise
  res.json({ ok: true, results, total: results.length });  // accessibilité immédiate
});
```

**Les tests mockent les fonctions de recherche pour retourner des valeurs synchrones** :
```javascript
searchWinesDb.mockReturnValue([...]); // mockReturnValue, pas mockResolvedValue
```

### Authentification dans les tests
- Les tokens JWT sont créés avec `jwt.sign()` en utilisant `config.JWT_SECRET`
- Mock Prisma retourne les utilisateurs attendus
- L'interception de l'auth se fait via les mocks middleware

### Base de données
- **Aucune vraie DB n'est utilisée** — tout est mocké avec Jest
- Les tests passent sans `DATABASE_URL` configurée
- Le mock Prisma peut être customisé par test via `prismaMock.***.mockResolvedValue()`

## Exemple de test

```javascript
describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();  // Nettoie les mocks avant chaque test
    req = { headers: {}, user: null };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('should attach user to req when token is valid', async () => {
    const validToken = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', role: 'user' },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );
    req.headers.authorization = `Bearer ${validToken}`;

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    await requireAuth(req, res, next);

    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
```

## Limitations actuelles

- Les tests ne couvrent pas les routes `auth.js`, `visite.js`, `events.js`, `admin.js`
- Pas de tests pour le scraping réel (cheerio)
- Pas de tests pour les scripts Python
- Pas de tests d'erreurs réseau/timeout (sauf status)

## Prochaines étapes

Pour étendre la suite :

1. **Routes auth** (`src/routes/auth.js`) :
   - Enregistrement, login, verification email, reset password
   - Mock Resend/nodemailer

2. **Routes visite** (`src/routes/visite.js`) :
   - GET /api/visite/:eventId
   - POST /api/admin/visite/* (gestion exposants)

3. **Routes events** (`src/routes/events.js`) :
   - GET /api/events
   - POST /api/admin/events/*

4. **Tests de performance** :
   - Stress tests searchWinesDb avec 10k+ entrées
   - Pagination performance

5. **Tests de sécurité** :
   - SQL injection dans normalize()
   - XSS dans les résultats API
   - Rate limiting

## Dépannage

### Jest not found
```bash
npm install
node node_modules/.bin/jest --version
```

### Erreurs de mock
Vérifier que les imports correspondent aux exports réels du code source (ex: `normalize` doit être exporté).

### Tests timeouts
Augmenter le timeout Jest (par défaut 5000ms) :
```javascript
jest.setTimeout(10000);
```

### Erreurs DATABASE_URL
Les tests n'utilisent pas de vraie DB — ce n'est pas un problème. Si Prisma throw une erreur d'init, vérifier que `jest.mock()` couvre bien Prisma avant tous les require.

---

**Créé** : Mars 2026
**Backend** : Node.js 18+ · Express 4.21 · Prisma 5.22
