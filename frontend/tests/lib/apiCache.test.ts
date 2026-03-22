import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCached,
  invalidateCache,
  invalidateCachePrefix,
} from '../../src/lib/apiCache';

describe('apiCache.ts', () => {
  beforeEach(() => {
    // Reset the cache by clearing all cached entries
    // We do this by calling getCached with expired TTL multiple times
    vi.clearAllMocks();
  });

  describe('getCached', () => {
    it('should call fetcher on cache miss', async () => {
      const fetcher = vi.fn(async () => 'data-1');
      const result = await getCached('key-1', fetcher);
      expect(result).toBe('data-1');
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it('should return cached data without calling fetcher on cache hit', async () => {
      const fetcher = vi.fn(async () => 'data-2');

      // First call
      const result1 = await getCached('key-2', fetcher);
      expect(result1).toBe('data-2');
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call within TTL
      const result2 = await getCached('key-2', fetcher);
      expect(result2).toBe('data-2');
      expect(fetcher).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should respect TTL and recalculate after expiration', async () => {
      const fetcher = vi.fn(async () => `data-${Date.now()}`);

      const result1 = await getCached('key-ttl', fetcher, 100); // 100ms TTL
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result2 = await getCached('key-ttl', fetcher, 100);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(result1).not.toBe(result2);
    });

    it('should use default TTL of 5000ms', async () => {
      const fetcher = vi.fn(async () => 'default-ttl-data');

      const result1 = await getCached('key-default', fetcher);
      expect(result1).toBe('default-ttl-data');
      expect(fetcher).toHaveBeenCalledTimes(1);

      const result2 = await getCached('key-default', fetcher);
      expect(result2).toBe('default-ttl-data');
      expect(fetcher).toHaveBeenCalledTimes(1); // Cached within default TTL
    });

    it('should handle different data types', async () => {
      const objectData = { name: 'Wine', year: 2020 };
      const fetcher1 = vi.fn(async () => objectData);
      const result1 = await getCached('key-obj', fetcher1);
      expect(result1).toEqual(objectData);

      const arrayData = [1, 2, 3, 4, 5];
      const fetcher2 = vi.fn(async () => arrayData);
      const result2 = await getCached('key-array', fetcher2);
      expect(result2).toEqual(arrayData);

      const numberData = 42;
      const fetcher3 = vi.fn(async () => numberData);
      const result3 = await getCached('key-number', fetcher3);
      expect(result3).toBe(numberData);
    });

    it('should handle fetcher errors', async () => {
      const fetcher = vi.fn(async () => {
        throw new Error('Fetcher failed');
      });

      await expect(getCached('key-error', fetcher)).rejects.toThrow('Fetcher failed');
    });
  });

  describe('invalidateCache', () => {
    it('should remove cached entry by key', async () => {
      const fetcher = vi.fn(async () => 'data-to-invalidate');

      const result1 = await getCached('key-to-invalidate', fetcher);
      expect(result1).toBe('data-to-invalidate');
      expect(fetcher).toHaveBeenCalledTimes(1);

      invalidateCache('key-to-invalidate');

      const result2 = await getCached('key-to-invalidate', fetcher);
      expect(result2).toBe('data-to-invalidate');
      expect(fetcher).toHaveBeenCalledTimes(2); // Called again after invalidation
    });

    it('should not affect other cache entries', async () => {
      const fetcher1 = vi.fn(async () => 'data-1');
      const fetcher2 = vi.fn(async () => 'data-2');

      await getCached('key-1', fetcher1);
      await getCached('key-2', fetcher2);

      invalidateCache('key-1');

      await getCached('key-1', fetcher1);
      await getCached('key-2', fetcher2);

      expect(fetcher1).toHaveBeenCalledTimes(2); // Called twice (invalidated)
      expect(fetcher2).toHaveBeenCalledTimes(1); // Called once (not invalidated)
    });

    it('should not throw error when invalidating non-existent key', () => {
      expect(() => {
        invalidateCache('non-existent-key');
      }).not.toThrow();
    });
  });

  describe('invalidateCachePrefix', () => {
    it('should remove all cache entries with matching prefix', async () => {
      const fetcher = vi.fn(async (key: string) => `data-${key}`);

      await getCached('search:bordeaux', fetcher);
      await getCached('search:burgundy', fetcher);
      await getCached('wine:123', fetcher);

      expect(fetcher).toHaveBeenCalledTimes(3);

      invalidateCachePrefix('search:');

      await getCached('search:bordeaux', fetcher);
      await getCached('search:burgundy', fetcher);
      await getCached('wine:123', fetcher);

      // search entries should be called again (2 more calls)
      // wine entry should not be called again
      expect(fetcher).toHaveBeenCalledTimes(5);
    });

    it('should leave non-matching entries untouched', async () => {
      const fetcher = vi.fn(async (key: string) => `data-${key}`);

      await getCached('api:status', fetcher);
      await getCached('api:config', fetcher);
      await getCached('cache:other', fetcher);

      invalidateCachePrefix('api:');

      await getCached('api:status', fetcher);
      await getCached('api:config', fetcher);
      await getCached('cache:other', fetcher);

      expect(fetcher).toHaveBeenCalledTimes(5); // api entries called again, cache:other not
    });

    it('should handle empty prefix', () => {
      expect(() => {
        invalidateCachePrefix('');
      }).not.toThrow();
    });

    it('should match prefix correctly without false matches', async () => {
      const fetcher = vi.fn(async (key: string) => `data-${key}`);

      await getCached('search:result', fetcher);
      await getCached('searched', fetcher); // Contains "search" but not as prefix

      invalidateCachePrefix('search:');

      await getCached('search:result', fetcher);
      await getCached('searched', fetcher);

      // Only search:result should be invalidated
      expect(fetcher).toHaveBeenCalledTimes(3); // 2 initial + 1 for search:result
    });
  });
});
