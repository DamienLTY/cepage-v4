/**
 * useCompare — Encapsule l'état de la comparaison de vins (max 3).
 * Extrait de App.tsx.
 */
import { useState, useCallback } from 'react';
import type { WineResult } from '../lib/wineSearch';

export function useCompare() {
  const [compareList, setCompareList] = useState<WineResult[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const handleCompare = useCallback((wine: WineResult) => {
    setCompareList(prev => {
      if (prev.some(c => c.foundName === wine.foundName)) {
        return prev.filter(c => c.foundName !== wine.foundName);
      }
      if (prev.length >= 3) return prev;
      return [...prev, wine];
    });
  }, []);

  const removeFromCompare = useCallback((wine: WineResult) => {
    setCompareList(prev => prev.filter(c => c.foundName !== wine.foundName));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    setShowCompare(false);
  }, []);

  return {
    compareList,
    showCompare,
    setShowCompare,
    handleCompare,
    removeFromCompare,
    clearCompare,
  };
}
