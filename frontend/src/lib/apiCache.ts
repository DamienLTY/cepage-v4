/**
 * Cache mémoire simple pour les appels API.
 * Évite les requêtes redondantes (ex: /api/status appelé à chaque mount AdminPage).
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Récupère une valeur en cache ou exécute le fetcher si expirée.
 * @param key    Clé unique (ex: "api-status", "search:bordeaux")
 * @param fetcher Fonction async qui retourne la donnée
 * @param ttl    Durée de vie en ms (défaut: 5000ms)
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 5000
): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expires > Date.now()) {
    return entry.data;
  }
  const data = await fetcher();
  cache.set(key, { data, expires: Date.now() + ttl });
  return data;
}

/** Invalide une entrée du cache (ex: après une mutation). */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/** Invalide toutes les entrées dont la clé commence par un préfixe. */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
