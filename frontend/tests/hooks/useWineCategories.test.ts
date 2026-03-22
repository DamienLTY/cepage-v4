import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCategoryWines,
  getCategoryCount,
  saveCategoryWines,
  addToCategory,
  removeFromCategory,
  getAllCategoryCounts,
} from '../../src/hooks/useWineCategories';
import type { WineCategory, WineCardData } from '../../src/types';

describe('useWineCategories.ts', () => {
  const mockWineCard1: WineCardData = {
    wineName: 'Château Margaux',
    year: 2020,
    stars: 3,
    color: 'red',
    region: 'Bordeaux',
  };

  const mockWineCard2: WineCardData = {
    wineName: 'Domaine de la Côte',
    year: 2019,
    stars: 2,
    color: 'rosé',
    region: 'Provence',
  };

  const mockWineCard3: WineCardData = {
    wineName: 'Veuve Clicquot',
    year: 2018,
    stars: 3,
    color: 'rosé',
    region: 'Champagne',
  };

  const categories: WineCategory[] = ['tasted', 'liked', 'favorite', 'cellar'];

  beforeEach(() => {
    // Clear all categories
    categories.forEach(cat => {
      localStorage.removeItem(`cepage_${cat}`);
    });
  });

  describe('getCategoryWines', () => {
    it('should return empty array for empty category', () => {
      const wines = getCategoryWines('tasted');
      expect(Array.isArray(wines)).toBe(true);
      expect(wines).toHaveLength(0);
    });

    it('should return stored wines from category', () => {
      const storedWines = [mockWineCard1, mockWineCard2];
      localStorage.setItem('cepage_tasted', JSON.stringify(storedWines));

      const wines = getCategoryWines('tasted');
      expect(wines).toHaveLength(2);
      expect(wines[0].wineName).toBe('Château Margaux');
      expect(wines[1].wineName).toBe('Domaine de la Côte');
    });

    it('should return empty array on corrupted data', () => {
      localStorage.setItem('cepage_liked', 'invalid-json{');
      const wines = getCategoryWines('liked');
      expect(wines).toEqual([]);
    });

    it('should work for all categories', () => {
      categories.forEach(cat => {
        const wines = getCategoryWines(cat);
        expect(Array.isArray(wines)).toBe(true);
      });
    });
  });

  describe('getCategoryCount', () => {
    it('should return 0 for empty category', () => {
      const count = getCategoryCount('tasted');
      expect(count).toBe(0);
    });

    it('should return correct count of wines', () => {
      const wines = [mockWineCard1, mockWineCard2, mockWineCard3];
      localStorage.setItem('cepage_favorite', JSON.stringify(wines));

      const count = getCategoryCount('favorite');
      expect(count).toBe(3);
    });

    it('should work for all categories', () => {
      categories.forEach(cat => {
        const count = getCategoryCount(cat);
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('saveCategoryWines', () => {
    it('should save wines to localStorage', () => {
      const wines = [mockWineCard1, mockWineCard2];
      saveCategoryWines('tasted', wines);

      const stored = JSON.parse(localStorage.getItem('cepage_tasted') || '[]');
      expect(stored).toHaveLength(2);
      expect(stored[0].wineName).toBe('Château Margaux');
    });

    it('should overwrite existing wines', () => {
      saveCategoryWines('liked', [mockWineCard1]);
      expect(getCategoryCount('liked')).toBe(1);

      saveCategoryWines('liked', [mockWineCard2, mockWineCard3]);
      expect(getCategoryCount('liked')).toBe(2);
      expect(getCategoryWines('liked')[0].wineName).toBe('Domaine de la Côte');
    });

    it('should save empty array', () => {
      saveCategoryWines('cellar', []);
      expect(getCategoryWines('cellar')).toEqual([]);
    });

    it('should preserve wine properties', () => {
      const wines = [mockWineCard1];
      saveCategoryWines('favorite', wines);

      const retrieved = getCategoryWines('favorite');
      expect(retrieved[0]).toEqual(mockWineCard1);
    });
  });

  describe('addToCategory', () => {
    it('should add wine to category', () => {
      const result = addToCategory('tasted', mockWineCard1);
      expect(result).toBe(true);
      expect(getCategoryCount('tasted')).toBe(1);
    });

    it('should add wine to beginning of list', () => {
      addToCategory('liked', mockWineCard1);
      addToCategory('liked', mockWineCard2);

      const wines = getCategoryWines('liked');
      expect(wines[0].wineName).toBe('Domaine de la Côte');
      expect(wines[1].wineName).toBe('Château Margaux');
    });

    it('should return false when wine already exists', () => {
      const result1 = addToCategory('favorite', mockWineCard1);
      expect(result1).toBe(true);

      const result2 = addToCategory('favorite', mockWineCard1);
      expect(result2).toBe(false);
      expect(getCategoryCount('favorite')).toBe(1);
    });

    it('should check by wine name and year', () => {
      addToCategory('cellar', mockWineCard1);

      // Same wine but different star rating
      const sameWineModified = { ...mockWineCard1, stars: 1 };
      const result = addToCategory('cellar', sameWineModified);

      expect(result).toBe(false); // Should still be considered duplicate
      expect(getCategoryCount('cellar')).toBe(1);
    });

    it('should allow same wine in different categories', () => {
      const result1 = addToCategory('tasted', mockWineCard1);
      const result2 = addToCategory('liked', mockWineCard1);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(getCategoryCount('tasted')).toBe(1);
      expect(getCategoryCount('liked')).toBe(1);
    });

    it('should distinguish wines by year', () => {
      const wine2020 = mockWineCard1; // 2020
      const wine2019 = { ...mockWineCard1, year: 2019 };

      addToCategory('favorite', wine2020);
      const result = addToCategory('favorite', wine2019);

      expect(result).toBe(true);
      expect(getCategoryCount('favorite')).toBe(2);
    });
  });

  describe('removeFromCategory', () => {
    it('should remove wine by name and year', () => {
      addToCategory('tasted', mockWineCard1);
      expect(getCategoryCount('tasted')).toBe(1);

      removeFromCategory('tasted', 'Château Margaux', 2020);
      expect(getCategoryCount('tasted')).toBe(0);
    });

    it('should not remove different vintage of same wine', () => {
      addToCategory('liked', mockWineCard1); // 2020
      const wine2019 = { ...mockWineCard1, year: 2019 };
      addToCategory('liked', wine2019);

      removeFromCategory('liked', 'Château Margaux', 2020);
      expect(getCategoryCount('liked')).toBe(1);
      expect(getCategoryWines('liked')[0].year).toBe(2019);
    });

    it('should handle removing non-existent wine', () => {
      addToCategory('favorite', mockWineCard1);
      expect(() => {
        removeFromCategory('favorite', 'Non-existent Wine', 2020);
      }).not.toThrow();
      expect(getCategoryCount('favorite')).toBe(1);
    });

    it('should remove from empty category', () => {
      expect(() => {
        removeFromCategory('cellar', 'Some Wine', 2020);
      }).not.toThrow();
      expect(getCategoryCount('cellar')).toBe(0);
    });

    it('should maintain order after removal', () => {
      addToCategory('tasted', mockWineCard1);
      addToCategory('tasted', mockWineCard2);
      addToCategory('tasted', mockWineCard3);

      removeFromCategory('tasted', 'Domaine de la Côte', 2019);

      const wines = getCategoryWines('tasted');
      expect(wines).toHaveLength(2);
      expect(wines[0].wineName).toBe('Veuve Clicquot');
      expect(wines[1].wineName).toBe('Château Margaux');
    });
  });

  describe('getAllCategoryCounts', () => {
    it('should return zero counts for empty categories', () => {
      const counts = getAllCategoryCounts();
      expect(counts).toEqual({
        tasted: 0,
        liked: 0,
        favorite: 0,
        cellar: 0,
      });
    });

    it('should return correct counts for all categories', () => {
      addToCategory('tasted', mockWineCard1);
      addToCategory('tasted', mockWineCard2);
      addToCategory('liked', mockWineCard1);
      addToCategory('favorite', mockWineCard3);

      const counts = getAllCategoryCounts();
      expect(counts).toEqual({
        tasted: 2,
        liked: 1,
        favorite: 1,
        cellar: 0,
      });
    });

    it('should update dynamically', () => {
      let counts = getAllCategoryCounts();
      expect(counts.tasted).toBe(0);

      addToCategory('tasted', mockWineCard1);
      counts = getAllCategoryCounts();
      expect(counts.tasted).toBe(1);

      removeFromCategory('tasted', 'Château Margaux', 2020);
      counts = getAllCategoryCounts();
      expect(counts.tasted).toBe(0);
    });

    it('should have all required keys', () => {
      const counts = getAllCategoryCounts();
      expect(counts).toHaveProperty('tasted');
      expect(counts).toHaveProperty('liked');
      expect(counts).toHaveProperty('favorite');
      expect(counts).toHaveProperty('cellar');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full CRUD workflow', () => {
      // Create
      const addResult = addToCategory('favorite', mockWineCard1);
      expect(addResult).toBe(true);

      // Read
      const wines = getCategoryWines('favorite');
      expect(wines).toHaveLength(1);
      expect(wines[0].wineName).toBe('Château Margaux');

      // Update (remove and add modified version)
      removeFromCategory('favorite', 'Château Margaux', 2020);
      const modifiedWine = { ...mockWineCard1, stars: 2 };
      addToCategory('favorite', modifiedWine);
      expect(getCategoryWines('favorite')[0].stars).toBe(2);

      // Delete
      removeFromCategory('favorite', 'Château Margaux', 2020);
      expect(getCategoryCount('favorite')).toBe(0);
    });

    it('should manage wines across multiple categories', () => {
      addToCategory('tasted', mockWineCard1);
      addToCategory('liked', mockWineCard1);
      addToCategory('favorite', mockWineCard1);
      addToCategory('cellar', mockWineCard1);

      const counts = getAllCategoryCounts();
      expect(counts.tasted).toBe(1);
      expect(counts.liked).toBe(1);
      expect(counts.favorite).toBe(1);
      expect(counts.cellar).toBe(1);

      removeFromCategory('tasted', 'Château Margaux', 2020);
      const newCounts = getAllCategoryCounts();
      expect(newCounts.tasted).toBe(0);
      expect(newCounts.liked).toBe(1);
    });

    it('should handle multiple wines in category', () => {
      addToCategory('tasted', mockWineCard1);
      addToCategory('tasted', mockWineCard2);
      addToCategory('tasted', mockWineCard3);

      expect(getCategoryCount('tasted')).toBe(3);

      removeFromCategory('tasted', 'Domaine de la Côte', 2019);

      const remaining = getCategoryWines('tasted');
      expect(remaining).toHaveLength(2);
      expect(remaining.map(w => w.wineName)).toContain('Château Margaux');
      expect(remaining.map(w => w.wineName)).toContain('Veuve Clicquot');
    });
  });
});
