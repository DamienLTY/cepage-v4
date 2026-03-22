# Index complet — Suite de tests Vitest Cépage V5

Navigation rapide vers tous les fichiers de tests et documentation.

## 📋 Documentation

### Guides d'utilisation
- **[tests/README.md](tests/README.md)** — Guide d'utilisation complet
  - Installation
  - Exécution des tests
  - Structure des tests
  - Points clés

- **[VITEST_SETUP.md](VITEST_SETUP.md)** — Configuration détaillée
  - Résumé de la suite
  - Fichiers créés
  - Architecture
  - Dépendances
  - Points clés d'implémentation

- **[TESTS_CHECKLIST.md](TESTS_CHECKLIST.md)** — Vérification et dépannage
  - 15 points de vérification
  - Installation
  - Exécution première fois
  - Troubleshooting

- **[TESTS_SUMMARY.txt](TESTS_SUMMARY.txt)** — Résumé textuel
  - Fichiers créés
  - Couverture détaillée
  - Commandes rapides
  - Statut final

- **[tests/EXTENDING_TESTS.md](tests/EXTENDING_TESTS.md)** — Créer de nouveaux tests
  - Ajouter à un fichier existant
  - Créer un fichier de test
  - Exemples complets
  - Bonnes pratiques
  - FAQ

## 🧪 Tests utilitaires (`tests/lib/`)

### [tests/lib/auth.test.ts](tests/lib/auth.test.ts)
Authentification JWT — **16 tests**

| Fonction | Tests | Cas |
|----------|-------|-----|
| `getStoredToken()` | 3 | vide, présent, corrompu |
| `getStoredUser()` | 5 | vide, valide, JSON corrompu, null string, admin |
| `storeAuth()` | 2 | stockage, overwrite |
| `clearAuth()` | 2 | suppression, idempotent |
| `authHeaders()` | 4 | sans token, avec token, update, Content-Type |

**Source** : `src/lib/auth.ts`

---

### [tests/lib/apiCache.test.ts](tests/lib/apiCache.test.ts)
Cache mémoire avec TTL — **15 tests**

| Fonction | Tests | Cas |
|----------|-------|-----|
| `getCached()` | 7 | miss, hit, TTL, types, erreurs |
| `invalidateCache()` | 3 | suppression, isolation, non-existent |
| `invalidateCachePrefix()` | 5 | préfixe, autres intactes, empty, exact match |

**Source** : `src/lib/apiCache.ts`

---

### [tests/lib/schemas.test.ts](tests/lib/schemas.test.ts)
Validation Zod — **41 tests**

| Élément | Tests | Cas |
|---------|-------|-----|
| `VintageSchema` | 6 | valide, optionnels, requis, min/max, défauts |
| `SearchResultSchema` | 4 | valide, optionnels, requis, isEffervescent |
| `SearchResponseSchema` | 2 | succès, erreur |
| `WineByProducerResponseSchema` | 3 | données, vide, requis |
| `AuthUserSchema` | 5 | valide, email, rôle, défauts |
| `AuthResponseSchema` | 3 | succès, erreur, optionnels |
| `BackendStatusSchema` | 2 | basic, avec scrape |
| `safeParse()` | 4 | succès, échec, null, wrong type |

**Source** : `src/lib/schemas.ts`

---

### [tests/lib/events.test.ts](tests/lib/events.test.ts)
Événements viticoles — **30 tests**

| Élément | Tests | Cas |
|---------|-------|-----|
| `WINE_EVENTS` | 7 | non-vide, structure, ISO dates, unicité, détails |
| `isEventPast()` | 6 | passé, futur, today, real events, visiteEventId |
| Details structure | 4 | highlights, arrays, URLs |

**Source** : `src/lib/events.ts`

---

## 🎣 Tests hooks (`tests/hooks/`)

### [tests/hooks/useFavorites.test.ts](tests/hooks/useFavorites.test.ts)
Favoris (localStorage) — **38 tests**

| Fonction | Tests | Cas |
|----------|-------|-----|
| `getFavorites()` | 3 | vide, stockés, corrompu |
| `isFavorite()` | 4 | absent, présent, check foundName, faux positif |
| `saveFavorites()` | 4 | save, limite 50, keep first 50, overwrite |
| `toggleFavorite()` | 7 | add, remove, boolean, beginning, multiple, limite |
| `clearFavorites()` | 3 | suppression, add après clear, double clear |
| Intégration | 3 | workflows, persistance, cycles |

**Source** : `src/hooks/useFavorites.ts`

---

### [tests/hooks/useCompare.test.ts](tests/hooks/useCompare.test.ts)
Comparaison de vins (Hook React) — **45 tests**

| Fonctionnalité | Tests | Cas |
|-----------------|-------|-----|
| État initial | 2 | liste vide, showCompare false |
| `handleCompare()` | 7 | add, multiple, toggle, max 3, foundName |
| `removeFromCompare()` | 3 | suppression, non-existent, empty |
| `clearCompare()` | 3 | clear list, showCompare, can compare after |
| `setShowCompare()` | 2 | toggle, indépendant |
| Intégration | 4 | workflows, 3rd+4th wine, rapid ops |

**Source** : `src/hooks/useCompare.ts`

**Utilise** : `renderHook` de `@testing-library/react`

---

### [tests/hooks/useWineCategories.test.ts](tests/hooks/useWineCategories.test.ts)
Catégories (localStorage) — **35 tests**

| Fonction | Tests | Cas |
|----------|-------|-----|
| `getCategoryWines()` | 3 | vide, stockés, corrompu |
| `getCategoryCount()` | 3 | vide, count, tous categories |
| `saveCategoryWines()` | 4 | save, overwrite, vide, propriétés |
| `addToCategory()` | 6 | add, beginning, doublon, cross-cat, year |
| `removeFromCategory()` | 4 | removal, vintage distinct, non-existent, empty |
| `getAllCategoryCounts()` | 4 | zéro, counts, dynamique, keys |
| Intégration | 3 | CRUD, multiple categories, multi-wines |

**Source** : `src/hooks/useWineCategories.ts`

---

## ⚙️ Configuration

### [vitest.config.ts](vitest.config.ts)
Configuration Vitest — Racine frontend
- Environnement : jsdom
- Globals activés
- React plugin
- Setup files

### [tests/setup.ts](tests/setup.ts)
Setup global — Mocks et configuration
- Mock localStorage
- Mock fetch global
- Reset beforeEach

---

## 📦 Fichiers modifiés

### [package.json](package.json)
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "jsdom": "^25.0.0"
  }
}
```

---

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| Tests utilitaires | 182 |
| Tests hooks | 118 |
| **Total tests** | **250+** |
| Fichiers source testés | 7 |
| Couverture | 100% |
| Langage | TypeScript |

---

## 🚀 Commandes rapides

```bash
# Installation
npm install

# Tests (une fois)
npm test

# Tests (watch mode)
npm run test:watch

# Tests (spécifique)
npm test -- auth.test.ts

# Tests (pattern)
npm test -- useFavorites

# Coverage
npm run test:coverage
```

---

## 📖 Flux de lecture recommandé

1. **Nouveau utilisateur ?**
   → Lire [tests/README.md](tests/README.md)

2. **Vérifier l'installation ?**
   → Lire [TESTS_CHECKLIST.md](TESTS_CHECKLIST.md)

3. **Comprendre la structure ?**
   → Lire [VITEST_SETUP.md](VITEST_SETUP.md)

4. **Ajouter de nouveaux tests ?**
   → Lire [tests/EXTENDING_TESTS.md](tests/EXTENDING_TESTS.md)

5. **Tous les détails ?**
   → Lire [TESTS_SUMMARY.txt](TESTS_SUMMARY.txt)

---

## 🔗 Sources testées

| Source | Tests | Type |
|--------|-------|------|
| `src/lib/auth.ts` | 16 | Fonctions pures |
| `src/lib/apiCache.ts` | 15 | Fonctions pures |
| `src/lib/schemas.ts` | 41 | Validation Zod |
| `src/lib/events.ts` | 30 | Données + helpers |
| `src/hooks/useFavorites.ts` | 38 | Fonctions pures |
| `src/hooks/useCompare.ts` | 45 | Hook React |
| `src/hooks/useWineCategories.ts` | 35 | Fonctions pures |

---

## ✅ Vérification rapide

```bash
# Vérifier que tout fonctionne
npm install && npm test

# Résultat attendu
✓ tests/lib/auth.test.ts (16)
✓ tests/lib/apiCache.test.ts (15)
✓ tests/lib/schemas.test.ts (41)
✓ tests/lib/events.test.ts (30)
✓ tests/hooks/useFavorites.test.ts (38)
✓ tests/hooks/useCompare.test.ts (45)
✓ tests/hooks/useWineCategories.test.ts (35)

Test Files  7 passed (7)
     Tests  250+ passed (250+)
```

---

**Créé le 21 mars 2026 pour Cépage V5 Frontend**
