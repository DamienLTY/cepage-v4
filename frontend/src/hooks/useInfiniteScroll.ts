/**
 * useInfiniteScroll — Pagination par Intersection Observer (callback ref)
 *
 * Utilise une callback ref pour éviter le problème du sentinel null au premier render.
 * L'observer se connecte/déconnecte automatiquement quand le sentinel monte/démonte.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollResult<T> {
  visibleItems: T[];
  sentinelRef: (el: HTMLDivElement | null) => void;
  hasMore: boolean;
  loadedCount: number;
  reset: () => void;
}

export function useInfiniteScroll<T>(
  items: T[],
  pageSize: number = 20
): UseInfiniteScrollResult<T> {
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset quand la liste source change
  useEffect(() => {
    setPage(1);
  }, [items]);

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  // Callback ref: connecte l'observer quand l'élément monte, déconnecte quand il démonte
  const sentinelRef = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!el) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observerRef.current.observe(el);
  }, [loadMore]);

  const visibleItems = items.slice(0, page * pageSize);
  const hasMore = visibleItems.length < items.length;
  const loadedCount = visibleItems.length;

  const reset = useCallback(() => setPage(1), []);

  return { visibleItems, sentinelRef, hasMore, loadedCount, reset };
}
