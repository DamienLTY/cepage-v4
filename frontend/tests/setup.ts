import { beforeEach, vi } from 'vitest';

// Mock localStorage avec une implémentation en mémoire
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch global
global.fetch = vi.fn();

// Reset entre chaque test
beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});
