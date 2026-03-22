# Checklist de vérification — Tests Vitest Cépage V5

## 1. Installation des dépendances ✅

```bash
cd "3. SITE WEB HACHETTE V5/frontend"
npm install
```

Vérifie que `vitest`, `@testing-library/react`, `jsdom` sont installés :
```bash
npm list vitest @testing-library/react jsdom
```

## 2. Fichiers de configuration ✅

Vérifier que ces fichiers existent à la racine du frontend :

- [ ] `vitest.config.ts` — Configuration Vitest
- [ ] `tests/setup.ts` — Mock localStorage et fetch
- [ ] `package.json` — Scripts test + devDependencies mises à jour

Vérifier les modifications dans `package.json` :
```bash
grep -A 3 "\"test\":" package.json
```

## 3. Fichiers de test ✅

Vérifier que tous les tests existent :

### Utilitaires (`tests/lib/`)
- [ ] `auth.test.ts` (16 tests)
- [ ] `apiCache.test.ts` (15 tests)
- [ ] `schemas.test.ts` (41 tests)
- [ ] `events.test.ts` (30 tests)

### Hooks (`tests/hooks/`)
- [ ] `useFavorites.test.ts` (38 tests)
- [ ] `useCompare.test.ts` (45 tests)
- [ ] `useWineCategories.test.ts` (35 tests)

Compter les fichiers :
```bash
ls -la tests/lib/*.test.ts tests/hooks/*.test.ts
# Doit afficher 7 fichiers
```

## 4. Première exécution ✅

```bash
npm test
```

Résultat attendu :
- ✅ Tous les tests passent (250+ tests)
- ✅ Pas d'erreurs TypeScript
- ✅ Pas d'avertissements

Output typique :
```
 ✓ tests/lib/auth.test.ts (16)
 ✓ tests/lib/apiCache.test.ts (15)
 ✓ tests/lib/schemas.test.ts (41)
 ✓ tests/lib/events.test.ts (30)
 ✓ tests/hooks/useFavorites.test.ts (38)
 ✓ tests/hooks/useCompare.test.ts (45)
 ✓ tests/hooks/useWineCategories.test.ts (35)

 Test Files  7 passed (7)
      Tests  250+ passed (250+)
       Time  ~2-5s
```

## 5. Mode Watch ✅

```bash
npm run test:watch
```

Attendu :
- Watcher actif, prêt pour les changements
- Taper `q` pour quitter
- Changer un test et voir le rechargement auto

## 6. Tests spécifiques ✅

Tester un fichier particulier :
```bash
npm test -- auth.test.ts
```

Tester par pattern :
```bash
npm test -- useFavorites
```

## 7. Vérifier les imports ✅

Tous les imports doivent être corrects :

```bash
grep -r "import.*from.*src" tests/
```

Doit montrer des imports relatifs comme :
```
../../src/lib/auth
../../src/hooks/useFavorites
```

## 8. Vérifier types TypeScript ✅

```bash
npx tsc --noEmit
```

Attendu : 0 erreur

## 9. Tests isolés ✅

Lancer un test individuel plusieurs fois :
```bash
npm test -- useFavorites --reporter=verbose
```

Attendu : résultats identiques à chaque fois (pas d'état partagé)

## 10. Nettoyer et vérifier ✅

```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install

# Relancer les tests
npm test
```

Attendu : tout passe encore

## 11. Documentation ✅

Vérifier que la doc existe :

- [ ] `tests/README.md` — Guide d'utilisation
- [ ] `VITEST_SETUP.md` — Configuration détaillée
- [ ] `TESTS_CHECKLIST.md` — Cette checklist

## 12. Intégration avec l'IDE ✅

### VS Code
Installer l'extension Vitest :
```
Name: Vitest
Id: vitest.explorer
```

Après installation, les tests apparaissent dans l'Explorer avec :
- ✅ Tests verts (passé)
- ❌ Tests rouges (échoué)
- ⏸️ Tests gris (skipped)

### Command Palette
```
Ctrl+Shift+P → Vitest: Run All Tests
```

## 13. Coverage (optionnel) ✅

```bash
npm install -D @vitest/coverage-v8
npm run test:coverage
```

Doit générer :
- `coverage/` directory
- Rapport HTML accessible via `coverage/index.html`

Expected coverage :
- auth.ts : 100%
- apiCache.ts : 100%
- schemas.ts : 100%
- events.ts : 100%
- useFavorites.ts : 100%
- useCompare.ts : 100%
- useWineCategories.ts : 100%

## 14. CI/CD (optionnel) ✅

Pour GitHub Actions, ajouter à `.github/workflows/test.yml` :

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
```

## 15. Dépannage ✅

### Erreur : `vitest: command not found`
```bash
npm install -D vitest
```

### Erreur : `Cannot find module '@testing-library/react'`
```bash
npm install -D @testing-library/react jsdom
```

### Erreur : localStorage is not defined
Vérifier que `tests/setup.ts` est référencé dans `vitest.config.ts` :
```ts
setupFiles: ['./tests/setup.ts'],
```

### Tests lents
Vérifier que `environment: 'jsdom'` dans `vitest.config.ts` (non 'node')

### Erreurs TypeScript dans tests
Ajouter à `tsconfig.json` si absent :
```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

## Résumé final

- [ ] npm install réussi
- [ ] npm test passe (250+ tests)
- [ ] npm run test:watch fonctionne
- [ ] Pas d'erreurs TypeScript
- [ ] Documentation lisible
- [ ] IDE intégration (optionnel)
- [ ] Coverage installé (optionnel)

**Statut** : ✅ Suite de tests Vitest complète et fonctionnelle
