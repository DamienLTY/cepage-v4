import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFavorites,
  isFavorite,
  saveFavorites,
  toggleFavorite,
  clearFavorites,
} from '../../src/hooks/useFavorites';
import type { WineResult } from '../../src/lib/wineSearch';

describe('useFavorites.ts', () => {
  const mockWine1: WineResult = {
    foundName: 'Château Margaux 2020',
    producerName: 'Margaux Estate',
    producerUrl: 'https://example.com',
    concordance: 95,
    producerCode: 'MARG-001',
    region: 'Bordeaux',
    vintages: [
      {
        year: 2020,
        stars: 3,
        name: 'Château Margaux',
        color: 'red',
        type: 'AOC',
        link: 'https://example.com/wine',
        isEffervescent: false,
      },
    ],
  };

  const mockWine2: WineResult = {
    foundName: 'Domaine de la Côte 2019',
    producerName: 'La Côte',
    producerUrl: 'https://example.com/lacote',
    concordance: 88,
    producerCode: 'COTE-001',
    region: 'Provence',
    vintages: [
      {
        year: 2019,
        stars: 2,
        name: 'Domaine de la Côte',
        color: 'rosé',
        type: 'AOC',
        link: 'https://example.com/wine2',
        isEffervescent: false,
      },
    ],
  };

  const mockWine3: WineResult = {
    foundName: 'Champagne Veuve Clicquot 2018',
    producerName: 'Veuve Clicquot',
    producerUrl: 'https://example.com/vc',
    concordance: 99,
    producerCode: 'VC-001',
    region: 'Champagne',
    vintages: [
      {
        year: 2018,
        stars: 3,
        name: 'Veuve Clicquot',
        color: 'rosé',
        type: 'Champagne',
        link: 'https://example.com/wine3',
        isEffervescent: true,
      },
    ],
  };

  beforeEach(() => {
    clearFavorites();
  });

  describe('getFavorites', () => {
    it('should return empty array when no favorites stored', () => {
      const favorites = getFavorites();
      expect(Array.isArray(favorites)).toBe(true);
      expect(favorites).toHaveLength(0);
    });

    it('should return stored favorites', () => {
      const initialFavs = [mockWine1, mockWine2];
      saveFavorites(initialFavs);
      const retrieved = getFavorites();
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].foundName).toBe('Château Margaux 2020');
      expect(retrieved[1].foundName).toBe('Domaine de la Côte 2019');
    });

    it('should return empty array on corrupted localStorage', () => {
      localStorage.setItem('cepage_favorites', 'invalid-json{');
      const favorites = getFavorites();
      expect(favorites).toEqual([]);
    });
  });

  describe('isFavorite', () => {
    it('should return false when wine is not in favorites', () => {
      expect(isFavorite(mockWine1)).toBe(false);
    });

    it('should return true when wine is in favorites', () => {
      toggleFavorite(mockWine1);
      expect(isFavorite(mockWine1)).toBe(true);
    });

    it('should check by foundName', () => {
      saveFavorites([mockWine1]);
      expect(isFavorite(mockWine1)).toBe(true);

      // Different wine object but same foundName
      const sameName = { ...mockWine2, foundName: mockWine1.foundName };
      expect(isFavorite(sameName)).toBe(true);
    });

    it('should return false for different wine with similar name', () => {
      saveFavorites([mockWine1]);
      const similarName = { ...mockWine2, foundName: 'Château Margaux 2019' };
      expect(isFavorite(similarName)).toBe(false);
    });
  });

  describe('saveFavorites', () => {
    it('should save favorites to localStorage', () => {
      const favs = [mockWine1, mockWine2];
      saveFavorites(favs);
      const stored = JSON.parse(localStorage.getItem('cepage_favorites') || '[]');
      expect(stored).toHaveLength(2);
      expect(stored[0].foundName).toBe('Château Margaux 2020');
    });

    it('should limit to 50 favorites', () => {
      const manyWines = Array.from({ length: 60 }, (_, i) => ({
        ...mockWine1,
        foundName: `Wine ${i}`,
      }));
      saveFavorites(manyWines);
      const stored = getFavorites();
      expect(stored).toHaveLength(50);
    });

    it('should keep the first 50 items when limiting', () => {
      const wines = Array.from({ length: 55 }, (_, i) => ({
        ...mockWine1,
        foundName: `Wine ${i}`,
      }));
      saveFavorites(wines);
      const stored = getFavorites();
      expect(stored[0].foundName).toBe('Wine 0');
      expect(stored[49].foundName).toBe('Wine 49');
    });

    it('should overwrite existing favorites', () => {
      saveFavorites([mockWine1]);
      expect(getFavorites()).toHaveLength(1);
      saveFavorites([mockWine2, mockWine3]);
      const stored = getFavorites();
      expect(stored).toHaveLength(2);
      expect(stored[0].foundName).toBe('Domaine de la Côte 2019');
    });
  });

  describe('toggleFavorite', () => {
    it('should add wine to favorites when not present', () => {
      const result = toggleFavorite(mockWine1);
      expect(result).toBe(true); // Added
      expect(isFavorite(mockWine1)).toBe(true);
    });

    it('should remove wine from favorites when already present', () => {
      toggleFavorite(mockWine1);
      expect(isFavorite(mockWine1)).toBe(true);

      const result = toggleFavorite(mockWine1);
      expect(result).toBe(false); // Removed
      expect(isFavorite(mockWine1)).toBe(false);
    });

    it('should return true on add, false on remove', () => {
      const addResult = toggleFavorite(mockWine1);
      expect(addResult).toBe(true);

      const removeResult = toggleFavorite(mockWine1);
      expect(removeResult).toBe(false);
    });

    it('should add wine to the beginning of the list', () => {
      saveFavorites([mockWine2, mockWine3]);
      toggleFavorite(mockWine1);
      const favs = getFavorites();
      expect(favs[0]).toEqual(mockWine1);
    });

    it('should handle multiple toggles', () => {
      // Add wine 1
      toggleFavorite(mockWine1);
      expect(getFavorites()).toHaveLength(1);

      // Add wine 2
      toggleFavorite(mockWine2);
      expect(getFavorites()).toHaveLength(2);

      // Remove wine 1
      toggleFavorite(mockWine1);
      expect(getFavorites()).toHaveLength(1);
      expect(isFavorite(mockWine1)).toBe(false);
      expect(isFavorite(mockWine2)).toBe(true);
    });

    it('should maintain 50-wine limit', () => {
      // Add many wines
      for (let i = 0; i < 55; i++) {
        const wine = { ...mockWine1, foundName: `Wine ${i}` };
        toggleFavorite(wine);
      }
      const favs = getFavorites();
      expect(favs).toHaveLength(50);
    });
  });

  describe('clearFavorites', () => {
    it('should remove all favorites from localStorage', () => {
      saveFavorites([mockWine1, mockWine2, mockWine3]);
      expect(getFavorites()).toHaveLength(3);

      clearFavorites();
      expect(getFavorites()).toHaveLength(0);
    });

    it('should allow adding favorites after clearing', () => {
      saveFavorites([mockWine1]);
      clearFavorites();
      toggleFavorite(mockWine2);
      expect(getFavorites()).toHaveLength(1);
      expect(isFavorite(mockWine2)).toBe(true);
    });

    it('should not throw when clearing empty favorites', () => {
      expect(() => {
        clearFavorites();
        clearFavorites();
      }).not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle add, check, remove sequence', () => {
      expect(isFavorite(mockWine1)).toBe(false);

      const addResult = toggleFavorite(mockWine1);
      expect(addResult).toBe(true);
      expect(isFavorite(mockWine1)).toBe(true);

      const removeResult = toggleFavorite(mockWine1);
      expect(removeResult).toBe(false);
      expect(isFavorite(mockWine1)).toBe(false);
    });

    it('should persist multiple wines with different names', () => {
      toggleFavorite(mockWine1);
      toggleFavorite(mockWine2);
      toggleFavorite(mockWine3);

      const favs = getFavorites();
      expect(favs).toHaveLength(3);
      expect(favs.map(f => f.foundName)).toContain('Château Margaux 2020');
      expect(favs.map(f => f.foundName)).toContain('Domaine de la Côte 2019');
      expect(favs.map(f => f.foundName)).toContain('Champagne Veuve Clicquot 2018');
    });

    it('should handle rapid add/remove cycles', () => {
      for (let i = 0; i < 5; i++) {
        toggleFavorite(mockWine1);
        toggleFavorite(mockWine2);
        toggleFavorite(mockWine1);
      }
      expect(isFavorite(mockWine1)).toBe(false);
      expect(isFavorite(mockWine2)).toBe(true);
    });
  });
});
