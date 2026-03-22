import { useEffect } from 'react';
import { BACKEND_URL } from '../lib/wineSearch';

/**
 * Maintient le backend Flask actif en pingant /api/status toutes les 10s.
 * Ne s'active que si l'utilisateur est connecté.
 */
export function useKeepAlive(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn) return;

    const ping = () => {
      fetch(`${BACKEND_URL}/api/status`, { signal: AbortSignal.timeout(3000) }).catch(() => {});
    };

    ping();
    const id = setInterval(ping, 10_000);
    return () => clearInterval(id);
  }, [isLoggedIn]);
}
