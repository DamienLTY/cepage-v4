/**
 * ═══════════════════════════════════════════════════════════
 * hooks/useFavorites.ts — Gestion des favoris (localStorage)
 * ═══════════════════════════════════════════════════════════
 *
 * Les favoris sont une liste de WineResult complets (différent
 * des bacs WineCardData qui ne stockent que les infos minimales).
 *
 * Usage :
 *   import { getFavorites, toggleFavorite, isFavorite } from '../hooks/useFavorites';
 */

import type { WineResult } from '../lib/wineSearch';
import { FAV_KEY } from '../constants';

// ── Lecture ──────────────────────────────────────────────────

/** Retourne la liste des favoris depuis localStorage */
export function getFavorites(): WineResult[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Vérifie si un vin est dans les favoris */
export function isFavorite(wine: WineResult): boolean {
  return getFavorites().some(f => f.foundName === wine.foundName);
}

// ── Écriture ─────────────────────────────────────────────────

/** Sauvegarde la liste des favoris (limité à 50 entrées) */
export function saveFavorites(favs: WineResult[]): void {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs.slice(0, 50)));
}

/**
 * Bascule l'état favori d'un vin.
 * @returns true si le vin vient d'être ajouté, false s'il vient d'être retiré
 */
export function toggleFavorite(wine: WineResult): boolean {
  const favs = getFavorites();
  const idx = favs.findIndex(f => f.foundName === wine.foundName);
  if (idx >= 0) {
    favs.splice(idx, 1);
    saveFavorites(favs);
    return false; // retiré
  } else {
    favs.unshift(wine);
    saveFavorites(favs);
    return true; // ajouté
  }
}

/** Supprime tous les favoris */
export function clearFavorites(): void {
  localStorage.removeItem(FAV_KEY);
}
