import { useEffect } from 'react';
import { BACKEND_URL } from '../lib/wineSearch';

/**
 * Maintient le backend actif en pingant /api/status toutes les 10s.
 * S'active toujours (connecté ou non) pour éviter le cold start Render.
 */
export function useKeepAlive(_isLoggedIn?: boolean) {
  useEffect(() => {
    const ping = () => {
      fetch(`${BACKEND_URL}/api/status`, { signal: AbortSignal.timeout(3000) }).catch(() => {});
    };

    ping();
    const id = setInterval(ping, 10_000);
    return () => clearInterval(id);
  }, []);
}
