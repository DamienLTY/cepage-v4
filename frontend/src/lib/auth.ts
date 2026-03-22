// auth.ts — Client auth helpers pour Cépage

export const BACKEND_URL = 'http://localhost:5000';
const TOKEN_KEY = 'cepage_jwt';
const USER_KEY = 'cepage_user';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  email_verified: boolean;
  created_at: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch { return null; }
}

export function storeAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

/** Sync les favoris localStorage vers le serveur au moment du login */
export async function syncFavoritesToServer(): Promise<void> {
  try {
    const localFavs = JSON.parse(localStorage.getItem('cepage_favorites') || '[]');
    if (localFavs.length === 0) return;
    await fetch(`${BACKEND_URL}/api/auth/favorites/sync`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ favorites: localFavs })
    });
  } catch { /* silently fail */ }
}

/** Vérifie si le token JWT est encore valide et retourne l'utilisateur */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const r = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(3000)
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.ok ? data.user : null;
  } catch { return null; }
}
