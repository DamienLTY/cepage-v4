import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompare } from '../../src/hooks/useCompare';
import type { WineResult } from '../../src/lib/wineSearch';

describe('useCompare hook', () => {
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

  const mockWine4: WineResult = {
    foundName: 'Bordeaux Red 2017',
    producerName: 'Some Vineyard',
    producerUrl: 'https://example.com/vineyard',
    concordance: 80,
    producerCode: 'VINE-001',
    region: 'Bordeaux',
    vintages: [
      {
        year: 2017,
        stars: 2,
        name: 'Bordeaux Red',
        color: 'red',
        type: 'AOC',
        link: 'https://example.com/wine4',
        isEffervescent: false,
      },
    ],
  };

  describe('Initial state', () => {
    it('should initialize with empty compare list', () => {
      const { result } = renderHook(() => useCompare());
      expect(result.current.compareList).toHaveLength(0);
    });

    it('should initialize showCompare as false', () => {
      const { result } = renderHook(() => useCompare());
      expect(result.current.showCompare).toBe(false);
    });
  });

  describe('handleCompare', () => {
    it('should add wine to compare list', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
      });

      expect(result.current.compareList).toHaveLength(1);
      expect(result.current.compareList[0].foundName).toBe('Château Margaux 2020');
    });

    it('should add multiple wines up to 3', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.handleCompare(mockWine2);
        result.current.handleCompare(mockWine3);
      });

      expect(result.current.compareList).toHaveLength(3);
    });

    it('should toggle wine when already in compare list', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
      });
      expect(result.current.compareList).toHaveLength(1);

      act(() => {
        result.current.handleCompare(mockWine1);
      });
      expect(result.current.compareList).toHaveLength(0);
    });

    it('should not add wine when max 3 wines reached', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.handleCompare(mockWine2);
        result.current.handleCompare(mockWine3);
        result.current.handleCompare(mockWine4); // 4th wine should not be added
      });

      expect(result.current.compareList).toHaveLength(3);
      expect(
        result.current.compareList.some(w => w.foundName === 'Bordeaux Red 2017'),
      ).toBe(false);
    });

    it('should allow adding wine after removing one when at max', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.handleCompare(mockWine2);
        result.current.handleCompare(mockWine3);
      });
      expect(result.current.compareList).toHaveLength(3);

      // Remove one
      act(() => {
        result.current.handleCompare(mockWine1);
      });
      expect(result.current.compareList).toHaveLength(2);

      // Now add another
      act(() => {
        result.current.handleCompare(mockWine4);
      });
      expect(result.current.compareList).toHaveLength(3);
      expect(result.current.compareList.some(w => w.foundName === 'Bordeaux Red 2017')).toBe(
        true,
      );
    });

    it('should identify wines by foundName', () => {
      const { result } = renderHook(() => useCompare());

      // Add wine 1
      act(() => {
        result.current.handleCompare(mockWine1);
      });

      // Try to add same wine with modified properties
      const sameName = { ...mockWine1, producerName: 'Different Producer' };
      act(() => {
        result.current.handleCompare(sameName);
      });

      // Should toggle, not add duplicate
      expect(result.current.compareList).toHaveLength(0);
    });
  });

  describe('removeFromCompare', () => {
    it('should remove wine from compare list by foundName', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.handleCompare(mockWine2);
      });
      expect(result.current.compareList).toHaveLength(2);

      act(() => {
        result.current.removeFromCompare(mockWine1);
      });

      expect(result.current.compareList).toHaveLength(1);
      expect(result.current.compareList[0].foundName).toBe('Domaine de la Côte 2019');
    });

    it('should not throw when removing non-existent wine', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
      });

      expect(() => {
        act(() => {
          result.current.removeFromCompare(mockWine2);
        });
      }).not.toThrow();

      expect(result.current.compareList).toHaveLength(1);
    });

    it('should handle removing from empty list', () => {
      const { result } = renderHook(() => useCompare());

      expect(() => {
        act(() => {
          result.current.removeFromCompare(mockWine1);
        });
      }).not.toThrow();

      expect(result.current.compareList).toHaveLength(0);
    });
  });

  describe('clearCompare', () => {
    it('should clear all wines from compare list', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.handleCompare(mockWine2);
        result.current.handleCompare(mockWine3);
      });
      expect(result.current.compareList).toHaveLength(3);

      act(() => {
        result.current.clearCompare();
      });

      expect(result.current.compareList).toHaveLength(0);
    });

    it('should set showCompare to false when clearing', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.setShowCompare(true);
      });
      expect(result.current.showCompare).toBe(true);

      act(() => {
        result.current.clearCompare();
      });

      expect(result.current.showCompare).toBe(false);
    });

    it('should allow comparing again after clear', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.clearCompare();
        result.current.handleCompare(mockWine2);
      });

      expect(result.current.compareList).toHaveLength(1);
      expect(result.current.compareList[0].foundName).toBe('Domaine de la Côte 2019');
    });
  });

  describe('setShowCompare', () => {
    it('should toggle showCompare state', () => {
      const { result } = renderHook(() => useCompare());

      expect(result.current.showCompare).toBe(false);

      act(() => {
        result.current.setShowCompare(true);
      });
      expect(result.current.showCompare).toBe(true);

      act(() => {
        result.current.setShowCompare(false);
      });
      expect(result.current.showCompare).toBe(false);
    });

    it('should be independent from compare list', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.setShowCompare(true);
      });

      expect(result.current.compareList).toHaveLength(1);
      expect(result.current.showCompare).toBe(true);

      act(() => {
        result.current.setShowCompare(false);
      });

      expect(result.current.compareList).toHaveLength(1);
      expect(result.current.showCompare).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical compare workflow', () => {
      const { result } = renderHook(() => useCompare());

      // User adds wines to compare
      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.handleCompare(mockWine2);
      });
      expect(result.current.compareList).toHaveLength(2);

      // Open compare overlay
      act(() => {
        result.current.setShowCompare(true);
      });
      expect(result.current.showCompare).toBe(true);

      // User changes mind and clears
      act(() => {
        result.current.clearCompare();
      });
      expect(result.current.compareList).toHaveLength(0);
      expect(result.current.showCompare).toBe(false);
    });

    it('should handle adding 3rd wine and trying 4th', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        result.current.handleCompare(mockWine1);
        result.current.handleCompare(mockWine2);
        result.current.handleCompare(mockWine3);
      });

      const before = result.current.compareList.length;

      act(() => {
        result.current.handleCompare(mockWine4);
      });

      // 4th wine should not be added, list stays at 3
      expect(result.current.compareList).toHaveLength(before);
    });

    it('should handle rapid add/remove operations', () => {
      const { result } = renderHook(() => useCompare());

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.handleCompare(mockWine1);
          result.current.handleCompare(mockWine2);
          result.current.handleCompare(mockWine1);
        }
      });

      expect(result.current.compareList).toHaveLength(1);
      expect(result.current.compareList[0].foundName).toBe('Domaine de la Côte 2019');
    });
  });
});
