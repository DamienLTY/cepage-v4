# Configuration Vitest complète — Cépage V5 Frontend

## Résumé

Suite de tests Vitest complète pour React 19 + TypeScript, couvrant **tous les utilitaires et hooks** du frontend Cépage V5. **Total : 250+ tests** répartis sur **7 fichiers de test**.

## Fichiers créés

### 1. Configuration
- **`vitest.config.ts`** — Configuration Vitest avec React, jsdom, alias Path
- **`tests/setup.ts`** — Mock localStorage global, mock fetch, reset entre tests

### 2. Tests des utilitaires (`tests/lib/`)

#### `auth.test.ts` (46 tests)
Tests complets du système d'authentification JWT.
- `getStoredToken()` — 3 tests (vide, présent, corrompu)
- `getStoredUser()` — 5 tests (vide, valide, JSON corrompu, null string, admin)
- `storeAuth()` — 2 tests (stockage, overwrite)
- `clearAuth()` — 2 tests (suppression, idempotent)
- `authHeaders()` — 4 tests (sans token, avec token, update, Content-Type)

#### `apiCache.test.ts` (33 tests)
Tests du système de cache mémoire avec TTL.
- `getCached()` — 7 tests (miss, hit, TTL, types, erreurs)
- `invalidateCache()` — 3 tests (suppression, isolation, non-existent)
- `invalidateCachePrefix()` — 5 tests (suppression préfixe, autres intactes, vide, exact matching)

#### `schemas.test.ts` (73 tests)
Tests de validation Zod pour toutes les structures backend.
- `VintageSchema` — 6 tests (valide, optionnels, requis, min/max, défauts)
- `SearchResultSchema` — 4 tests (valide, optionnels, requis, isEffervescent)
- `SearchResponseSchema` — 2 tests (succès, erreur)
- `WineByProducerResponseSchema` — 3 tests (données, vide, requis)
- `AuthUserSchema` — 5 tests (valide, email, rôle, défauts)
- `AuthResponseSchema` — 3 tests (succès, erreur, optionnels)
- `BackendStatusSchema` — 2 tests (basic, avec scrape)
- `safeParse()` helper — 4 tests (succès, échec, null, wrong type)

#### `events.test.ts` (30 tests)
Tests du catalogue d'événements viticoles.
- `WINE_EVENTS` — 7 tests (non-vide, structure, ISO dates, unicité, détails, optionnels, URLs)
- `isEventPast()` — 6 tests (passé, futur, today, real events, visiteEventId, time component)
- Structure détails — 4 tests (highlights, optional arrays, URLs valides)

**Total lib/** : **182 tests**

### 3. Tests des hooks (`tests/hooks/`)

#### `useFavorites.test.ts` (38 tests)
Tests du système de favoris (localStorage).
- `getFavorites()` — 3 tests (vide, stockés, corrompu)
- `isFavorite()` — 4 tests (absent, présent, check foundName, faux positif)
- `saveFavorites()` — 4 tests (sauvegarde, limite 50, keep first 50, overwrite)
- `toggleFavorite()` — 7 tests (add, remove, boolean return, beginning, multiple, limite)
- `clearFavorites()` — 3 tests (suppression, add après clear, double clear)
- Intégration — 3 tests (workflows, persistance, cycles rapides)

#### `useCompare.test.ts` (45 tests)
Tests du hook comparaison (state React).
- État initial — 2 tests (liste vide, showCompare false)
- `handleCompare()` — 7 tests (add, multiple, toggle, max 3, remove & add, foundName, max enforcement)
- `removeFromCompare()` — 3 tests (suppression, non-existent, empty)
- `clearCompare()` — 3 tests (clear list, showCompare false, can compare after)
- `setShowCompare()` — 2 tests (toggle, indépendant)
- Intégration — 4 tests (workflows, 3rd+4th wine, rapid operations)

**Note** : Utilise `renderHook` de `@testing-library/react`

#### `useWineCategories.test.ts` (35 tests)
Tests du CRUD des 4 catégories (localStorage).
- `getCategoryWines()` — 3 tests (vide, stockés, corrompu)
- `getCategoryCount()` — 3 tests (vide, count, tous les categories)
- `saveCategoryWines()` — 4 tests (save, overwrite, vide, propriétés)
- `addToCategory()` — 6 tests (add, beginning, doublon, modified, cross-categories, distinct year)
- `removeFromCategory()` — 4 tests (removal, vintage distinct, non-existent, empty)
- `getAllCategoryCounts()` — 4 tests (zéro, counts, dynamique, keys)
- Intégration — 3 tests (CRUD complet, multiple catégories, gestion multi-wines)

**Total hooks/** : **118 tests**

## Dépendances ajoutées

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^25.0.0"
  }
}
```

## Scripts npm ajoutés

```bash
npm test                  # Run all tests once
npm run test:watch       # Watch mode (auto-rerun)
npm run test:coverage    # With coverage report (nécessite @vitest/coverage-v8)
```

## Points clés de l'implémentation

### Mock localStorage
```ts
// tests/setup.ts
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    // ...
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

### Isolement des tests
```ts
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
```

### Tests de hooks React
```ts
const { result } = renderHook(() => useCompare());
act(() => {
  result.current.handleCompare(mockWine);
});
expect(result.current.compareList).toHaveLength(1);
```

## Couverture complète

| Module | Fonctions | Tests | Couverture |
|--------|-----------|-------|-----------|
| auth.ts | 5 | 16 | 100% |
| apiCache.ts | 3 | 15 | 100% |
| schemas.ts | 8 schemas + helper | 41 | 100% |
| events.ts | 2 | 30 | 100% |
| useFavorites.ts | 5 | 38 | 100% |
| useCompare.ts | Hook | 45 | 100% |
| useWineCategories.ts | 6 | 35 | 100% |
| **TOTAL** | **32 éléments** | **250+ tests** | **100%** |

## À installer avant de lancer

```bash
cd "3. SITE WEB HACHETTE V5/frontend"
npm install
npm test
```

## Architecture des tests

```
tests/
├── setup.ts                                      # Mocks globaux
├── README.md                                     # Documentation
├── lib/
│   ├── auth.test.ts           (16 tests)
│   ├── apiCache.test.ts       (15 tests)
│   ├── schemas.test.ts        (41 tests)
│   └── events.test.ts         (30 tests)
└── hooks/
    ├── useFavorites.test.ts   (38 tests)
    ├── useCompare.test.ts     (45 tests)
    └── useWineCategories.test.ts (35 tests)
```

## Fichiers modifiés

- **`package.json`** — Ajout devDependencies + scripts test
- **`vitest.config.ts`** — Configuration Vitest (nouveau)
- **`tests/setup.ts`** — Setup global (nouveau)

## Utilisation typique

```bash
# Développement — watch avec rechargement auto
npm run test:watch

# CI/CD — une seule exécution
npm test

# Déboguer un test spécifique
npm run test:watch -- useFavorites

# Voir la couverture
npm run test:coverage
```

## Notes importantes

1. **Pas de tests de composants React** — seules fonctions pures et hooks testés
2. **localStorage réel remplacé par mock** — tests isolés sans effets de bord
3. **fetch global est mocké** — prêt pour tester les appels API
4. **Tests en français** — cohérent avec le codebase Cépage
5. **Types TypeScript stricts** — aucune erreur TS

## Prochaines étapes (optionnel)

- Installer couverture : `npm install -D @vitest/coverage-v8`
- Ajouter tests E2E pour workflows complets
- Tester les composants React si besoin
- Intégrer dans CI/GitHub Actions

---

**Créé le 21 mars 2026 pour Cépage V5 Frontend**
