/**
 * ═══════════════════════════════════════════════════════════
 * hooks/useWineCategories.ts — CRUD des bacs de vins (localStorage)
 * ═══════════════════════════════════════════════════════════
 *
 * Gère les 4 catégories de vins : tasted, liked, favorite, cellar.
 * Les données sont stockées dans localStorage (clés dans constants/index.ts).
 *
 * Usage :
 *   import { getCategoryWines, addToCategory, removeFromCategory } from '../hooks/useWineCategories';
 */

import type { WineCategory, WineCardData } from '../types';
import { CAT_KEYS } from '../constants';

// ── Lecture ──────────────────────────────────────────────────

/** Retourne tous les vins d'une catégorie depuis localStorage */
export function getCategoryWines(category: WineCategory): WineCardData[] {
  try {
    return JSON.parse(localStorage.getItem(CAT_KEYS[category]) || '[]');
  } catch {
    return [];
  }
}

/** Retourne le nombre de vins dans une catégorie */
export function getCategoryCount(category: WineCategory): number {
  return getCategoryWines(category).length;
}

// ── Écriture ─────────────────────────────────────────────────

/** Sauvegarde la liste d'une catégorie dans localStorage */
export function saveCategoryWines(category: WineCategory, wines: WineCardData[]): void {
  localStorage.setItem(CAT_KEYS[category], JSON.stringify(wines));
}

/**
 * Ajoute un vin dans une catégorie.
 * Un vin peut exister dans plusieurs catégories simultanément.
 * @returns false si le vin est déjà présent dans cette catégorie
 */
export function addToCategory(category: WineCategory, wine: WineCardData): boolean {
  const wines = getCategoryWines(category);
  // Vérifier si déjà présent (par nom + année)
  if (wines.some(w => w.wineName === wine.wineName && w.year === wine.year)) {
    return false;
  }
  wines.unshift(wine); // Ajout en tête de liste (le plus récent en premier)
  saveCategoryWines(category, wines);
  return true;
}

/**
 * Retire un vin d'une catégorie.
 * Identifie le vin par nom + année.
 */
export function removeFromCategory(category: WineCategory, wineName: string, year: number): void {
  const wines = getCategoryWines(category).filter(
    w => !(w.wineName === wineName && w.year === year)
  );
  saveCategoryWines(category, wines);
}

// ── Compteurs ────────────────────────────────────────────────

/** Retourne les compteurs de toutes les catégories */
export function getAllCategoryCounts(): Record<WineCategory, number> {
  return {
    tasted:   getCategoryCount('tasted'),
    liked:    getCategoryCount('liked'),
    favorite: getCategoryCount('favorite'),
    cellar:   getCategoryCount('cellar'),
  };
}
