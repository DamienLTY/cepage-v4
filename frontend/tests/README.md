# Tests Vitest — Cépage V5 Frontend

Suite de tests complète pour les fonctions pures et hooks React du frontend Cépage V5.

## Installation

```bash
npm install
```

## Exécution des tests

### Mode une seule exécution
```bash
npm test
```

### Mode watch (développement)
```bash
npm run test:watch
```

### Avec couverture de code
```bash
npm run test:coverage
```

## Structure des tests

```
tests/
├── setup.ts                    # Configuration globale
├── lib/                        # Tests des utilitaires
│   ├── auth.test.ts           # Tests du système d'authentification
│   ├── apiCache.test.ts       # Tests du cache mémoire API
│   ├── schemas.test.ts        # Tests des validations Zod
│   └── events.test.ts         # Tests des événements viticoles
└── hooks/                      # Tests des hooks React
    ├── useFavorites.test.ts    # Tests des favoris (localStorage)
    ├── useCompare.test.ts      # Tests de la comparaison de vins (hook)
    └── useWineCategories.test.ts # Tests des catégories (localStorage)
```

## Couverture par fichier source

### `lib/auth.ts` ✅
- `getStoredToken()` — récupération du token JWT
- `getStoredUser()` — récupération de l'utilisateur stocké
- `storeAuth()` — sauvegarde du token et utilisateur
- `clearAuth()` — suppression des données d'auth
- `authHeaders()` — construction des headers Authorization

**Cas testés** : localStorage vide, données valides, JSON corrompu, token absent/présent, rôles user/admin

### `lib/apiCache.ts` ✅
- `getCached()` — récupération avec mise en cache
- `invalidateCache()` — invalidation par clé
- `invalidateCachePrefix()` — invalidation par préfixe

**Cas testés** : cache hit/miss, TTL expiré, différents types de données, erreurs fetcher, invalidation préfixe

### `lib/schemas.ts` ✅
- `VintageSchema` — validation des millésimes
- `SearchResultSchema` — validation des résultats de recherche
- `SearchResponseSchema` — validation de la réponse search
- `WineByProducerResponseSchema` — validation des vins par producteur
- `AuthUserSchema` — validation des données utilisateur
- `AuthResponseSchema` — validation des réponses auth
- `BackendStatusSchema` — validation du statut backend
- `safeParse()` — helper de parsing sûr

**Cas testés** : données valides, champs manquants, valeurs invalides, défauts optionnels, contraintes min/max

### `lib/events.ts` ✅
- `WINE_EVENTS` — catalogue d'événements viticoles
- `isEventPast()` — détection d'événements passés

**Cas testés** : structure des événements, format ISO dates, unicité des IDs, classification past/future, visiteEventId optionnel

### `hooks/useFavorites.ts` ✅
- `getFavorites()` — récupération des favoris
- `isFavorite()` — vérification si favori
- `saveFavorites()` — sauvegarde des favoris
- `toggleFavorite()` — basculer favori (add/remove)
- `clearFavorites()` — supprimer tous les favoris

**Cas testés** : localStorage vide/plein, limite 50 vins, toggle add/remove, persistence, JSON corrompu

### `hooks/useCompare.ts` ✅ (Hook React)
- `handleCompare()` — ajouter/retirer vin de comparaison
- `removeFromCompare()` — retirer explicitement
- `clearCompare()` — vider la liste
- `setShowCompare()` — afficher/masquer overlay

**Cas testés** : limite max 3 vins, toggle par foundName, showCompare indépendant, workflows complets

### `hooks/useWineCategories.ts` ✅
- `getCategoryWines()` — récupération des vins d'une catégorie
- `getCategoryCount()` — comptage par catégorie
- `saveCategoryWines()` — sauvegarde
- `addToCategory()` — ajout (avec détection doublon)
- `removeFromCategory()` — suppression par name+year
- `getAllCategoryCounts()` — compteurs tous catégories

**Cas testés** : CRUD complet, categories indépendantes, même vin dans plusieurs catégories, distinction par année, localStorage

## Configuration

### `vitest.config.ts`
- Environnement : `jsdom` (DOM virtuel)
- Globals activés (describe, it, expect)
- Setup global via `tests/setup.ts`

### `tests/setup.ts`
- Mock localStorage avec implémentation en mémoire
- Mock global fetch
- Reset avant chaque test

## Points clés

1. **localStorage est mocké** — chaque test a un localStorage vierge
2. **Pas de composants React** — tests des fonctions pures uniquement
3. **Hooks React testés via `renderHook`** — useCompare utilise `@testing-library/react`
4. **Tests isolés** — pas d'état partagé entre tests
5. **Zod schemas testés par validation** — pas de parsing forcé

## Exemples de commandes

```bash
# Exécuter tous les tests
npm test

# Watch mode avec rechargement auto
npm run test:watch

# Exécuter un fichier spécifique
npm test -- auth.test.ts

# Watch un fichier
npm run test:watch -- auth.test.ts

# Pattern matching
npm test -- useFavorites

# Couverture (nécessite @vitest/coverage-v8)
npm run test:coverage
```

## Notes de développement

- Tests écrits en TypeScript avec types stricts
- Utilise Vitest 2.0+ et @testing-library/react 16+
- Mock localStorage réinitialisé entre tests
- Descriptions en français pour cohérence avec codebase
- Imports relatifs (`../../src/`) pour éviter aliasing

## À faire (optionnel)

- Ajouter couverture de code : `npm install -D @vitest/coverage-v8`
- Ajouter tests du composant React `useCompare` dans le DOM si nécessaire
- Tester les APIs (fetch réel) si backend disponible
- Tests visuels / snapshot si applicable
