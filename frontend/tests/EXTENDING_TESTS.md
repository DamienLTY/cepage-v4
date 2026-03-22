# Guide pour étendre les tests — Cépage V5

Ce document explique comment ajouter de nouveaux tests si vous modifiez ou ajoutez des fonctions.

## 1. Ajouter un test à un fichier existant

### Exemple : Ajouter un test à `auth.test.ts`

```ts
// Au sein du describe('auth.ts') existant, ajouter un nouveau test :
it('should handle special characters in token', () => {
  const specialToken = 'jwt-token-with-!@#$%^&*()';
  localStorage.setItem('cepage_jwt', specialToken);
  expect(getStoredToken()).toBe(specialToken);
});
```

Puis relancer :
```bash
npm test -- auth.test.ts
```

Le nouveau test s'affichera dans les résultats.

## 2. Ajouter un fichier de test complet

### Pas 1 : Créer le fichier

```bash
touch tests/lib/newFeature.test.ts
```

### Pas 2 : Importer les bases

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { myNewFunction } from '../../src/lib/newFeature';

describe('newFeature.ts', () => {
  beforeEach(() => {
    // Reset si utilise localStorage
    localStorage.clear();
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Pas 3 : Exécuter

```bash
npm test -- newFeature.test.ts
```

## 3. Tester une nouvelle fonction

### Fonction pure (sans state)

```ts
// src/lib/utils.ts
export function calculateWineScore(stars: number, year: number): number {
  return stars * 10 + (2026 - year);
}
```

**Test :**
```ts
import { describe, it, expect } from 'vitest';
import { calculateWineScore } from '../../src/lib/utils';

describe('calculateWineScore', () => {
  it('should calculate score correctly', () => {
    expect(calculateWineScore(3, 2020)).toBe(36); // 30 + 6
  });

  it('should handle edge cases', () => {
    expect(calculateWineScore(0, 2020)).toBe(6);
    expect(calculateWineScore(3, 2026)).toBe(30);
  });
});
```

### Hook React (avec state)

```ts
// src/hooks/useMyHook.ts
import { useState, useCallback } from 'react';

export function useMyHook() {
  const [value, setValue] = useState(0);
  const increment = useCallback(() => setValue(v => v + 1), []);
  return { value, increment };
}
```

**Test :**
```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../../src/hooks/useMyHook';

describe('useMyHook', () => {
  it('should increment value', () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.value).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.value).toBe(1);
  });
});
```

## 4. Tester des fonctions avec localStorage

```ts
export function myLocalStorageFunction() {
  const data = JSON.parse(localStorage.getItem('key') || '{}');
  data.updated = true;
  localStorage.setItem('key', JSON.stringify(data));
  return data;
}
```

**Test :**
```ts
it('should update localStorage', () => {
  localStorage.setItem('key', JSON.stringify({ initial: true }));

  const result = myLocalStorageFunction();

  expect(result.updated).toBe(true);
  expect(result.initial).toBe(true);
  expect(JSON.parse(localStorage.getItem('key') || '{}')).toEqual(result);
});
```

## 5. Tester des appels async/await

```ts
// src/lib/api.ts
export async function fetchWines(query: string) {
  const response = await fetch(`/api/search?q=${query}`);
  return response.json();
}
```

**Test :**
```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchWines } from '../../src/lib/api';

describe('fetchWines', () => {
  it('should fetch wines from API', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ results: [{ name: 'Wine 1' }] })
    });

    const result = await fetchWines('bordeaux');

    expect(result.results).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/search?q=bordeaux');
  });

  it('should handle fetch errors', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchWines('bordeaux')).rejects.toThrow('Network error');
  });
});
```

## 6. Tester avec Zod schemas

```ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
});

export function validateUser(data: unknown) {
  const result = UserSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

**Test :**
```ts
import { describe, it, expect } from 'vitest';
import { UserSchema, validateUser } from '../../src/lib/validation';

describe('validateUser', () => {
  it('should validate correct user data', () => {
    const user = { id: 1, email: 'test@example.com' };
    expect(validateUser(user)).toEqual(user);
  });

  it('should reject invalid email', () => {
    const invalid = { id: 1, email: 'not-an-email' };
    expect(validateUser(invalid)).toBeNull();
  });

  it('should validate schema directly', () => {
    const result = UserSchema.safeParse({ id: 1, email: 'test@example.com' });
    expect(result.success).toBe(true);
  });
});
```

## 7. Tester avec mocks vitest

```ts
import { describe, it, expect, vi } from 'vitest';

it('should call mock function', () => {
  const myMock = vi.fn((x) => x * 2);

  expect(myMock(5)).toBe(10);
  expect(myMock).toHaveBeenCalledWith(5);
  expect(myMock).toHaveBeenCalledTimes(1);
});

it('should mock module', async () => {
  vi.mock('../../src/lib/api', () => ({
    fetchWines: vi.fn(() => Promise.resolve([{ name: 'Wine' }]))
  }));

  const { fetchWines } = await import('../../src/lib/api');
  const result = await fetchWines();
  expect(result).toHaveLength(1);
});
```

## 8. Structure de test recommandée

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { myFunction } from '../../src/lib/myFile';

describe('myFile.ts', () => {
  // Setup avant chaque test
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // Grouper par fonction
  describe('myFunction', () => {
    // Cas heureux
    it('should return expected value', () => {
      expect(myFunction('input')).toBe('output');
    });

    // Cas limite
    it('should handle empty string', () => {
      expect(myFunction('')).toBe('default');
    });

    // Erreurs
    it('should throw on invalid input', () => {
      expect(() => myFunction(null)).toThrow();
    });
  });

  // Intégration
  describe('Integration', () => {
    it('should work with other functions', () => {
      // Multi-step scenario
    });
  });
});
```

## 9. Bonnes pratiques

### ✅ À FAIRE

```ts
// Noms descriptifs
it('should add wine to favorites when not already present', () => {
  // ...
});

// Tests indépendants
it('should work', () => {
  // Pas de dépendance sur test précédent
});

// Assertions claires
expect(result).toBe(expected);
expect(result).toHaveLength(3);
expect(result).toContainEqual({ id: 1 });

// Setup minimaliste
beforeEach(() => {
  localStorage.clear();
});
```

### ❌ À ÉVITER

```ts
// Noms vagues
it('should work', () => {});

// Tests couplés
it('step 1', () => { store[0] = 'value'; });
it('step 2', () => { expect(store[0]).toBe('value'); }); // Dépend du test 1

// Assertions floues
expect(result).toBeTruthy(); // Trop vague

// Setup excessif
beforeEach(() => {
  // 50 lignes de setup
});
```

## 10. Exécuter seulement vos nouveaux tests

```bash
# Un seul fichier
npm test -- myNewTest.test.ts

# Pattern matching
npm test -- wine

# Watch un fichier spécifique
npm run test:watch -- myNewTest.test.ts

# Voir seulement les failures
npm test -- --reporter=verbose
```

## 11. Déboguer un test

### Avec console.log
```ts
it('should debug', () => {
  const result = myFunction();
  console.log('Result:', result); // Visible avec npm test -- --reporter=verbose
  expect(result).toBe(expected);
});
```

### Avec debugger
```ts
it('should debug', () => {
  debugger; // Pause d'exécution
  const result = myFunction();
  expect(result).toBe(expected);
});

// Lancer avec node inspector
node --inspect-brk node_modules/vitest/vitest.mjs run
```

### Avec VS Code
1. Installer extension Vitest
2. Clic sur "Debug" au-dessus d'un test
3. Utiliser breakpoints normaux

## 12. Exemple complet : Nouvelle fonctionnalité

Supposons vous ajoutez `getSortedWines()` à `lib/wineSearch.ts`.

### Créer le test

```bash
vim tests/lib/wineSearch.test.ts
```

### Ajouter le test

```ts
describe('getSortedWines', () => {
  const wines = [
    { name: 'Wine A', year: 2020, stars: 2 },
    { name: 'Wine B', year: 2019, stars: 3 },
    { name: 'Wine C', year: 2020, stars: 3 },
  ];

  it('should sort wines by stars descending', () => {
    const sorted = getSortedWines(wines, 'stars');
    expect(sorted[0].stars).toBe(3);
    expect(sorted[2].stars).toBe(2);
  });

  it('should sort wines by year ascending', () => {
    const sorted = getSortedWines(wines, 'year', 'asc');
    expect(sorted[0].year).toBe(2019);
    expect(sorted[2].year).toBe(2020);
  });

  it('should handle empty array', () => {
    expect(getSortedWines([], 'stars')).toEqual([]);
  });
});
```

### Exécuter

```bash
npm test -- wineSearch.test.ts
```

## Questions fréquentes

### Q: Comment tester une fonction qui appelle localStorage sans mocks?
A: localStorage est déjà mocké dans `tests/setup.ts`, tu peux l'utiliser directement.

### Q: Comment tester une fonction async?
A: Utilise `async` et `await`, Vitest attend les Promises.

```ts
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});
```

### Q: Comment tester un hook avec props?
A: Passe les props via la fonction du hook.

```ts
const { result } = renderHook(() => useMyHook(initialValue));
```

### Q: Comment vérifier que fetch a été appelé avec les bons params?
A: Utilise `toHaveBeenCalledWith`.

```ts
expect(fetch).toHaveBeenCalledWith('/api/wines', { method: 'GET' });
```

---

Pour plus d'infos, voir :
- [Documentation Vitest](https://vitest.dev)
- [Testing Library React](https://testing-library.com/react)
- Tests existants dans `tests/lib/` et `tests/hooks/`
