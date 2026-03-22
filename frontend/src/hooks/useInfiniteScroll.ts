/**
 * useInfiniteScroll — Pagination par Intersection Observer
 *
 * Prend une liste complète, retourne les éléments visibles + ref sentinel.
 * Quand le sentinel entre dans le viewport, charge la page suivante.
 * Reset automatiquement quand le tableau `items` change (nouvelle recherche, filtre, etc.).
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollResult<T> {
  visibleItems: T[];
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  loadedCount: number;
  reset: () => void;
}

export function useInfiniteScroll<T>(
  items: T[],
  pageSize: number = 20
): UseInfiniteScrollResult<T> {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset quand la liste source change
  useEffect(() => {
    setPage(1);
  }, [items]);

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  // Intersection Observer sur le sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '100px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const visibleItems = items.slice(0, page * pageSize);
  const hasMore = visibleItems.length < items.length;
  const loadedCount = visibleItems.length;

  const reset = useCallback(() => setPage(1), []);

  return { visibleItems, sentinelRef, hasMore, loadedCount, reset };
}
