/**
 * ═══════════════════════════════════════════════════════════
 * constants/index.ts — Constantes globales de l'application
 * ═══════════════════════════════════════════════════════════
 *
 * Toutes les constantes partagées sont ici.
 * Pour changer le salon courant (Mode Visite) : modifier VISITE_EVENT_ID.
 */

import type { Page, WineCategory } from '../types';

// ── Identité du site ─────────────────────────────────────────
export const SITE_NAME = 'Cépage';
export const SITE_TAGLINE = 'Chaque vin raconte une histoire';

// ── Citations affichées pendant le chargement ────────────────
export const WINE_QUOTES = [
  "« Le vin est la lumière du soleil, retenue par l'eau. » — Galilée",
  "« Dans le vin, il y a de la sagesse. » — Benjamin Franklin",
  "« Un repas sans vin est une journée sans soleil. » — Brillat-Savarin",
  "« Le bon vin réjouit le cœur de l'homme. » — Psaumes",
  "« Boire du vin, c'est boire du génie. » — Baudelaire",
  "« La vérité est dans le vin. » — Pline l'Ancien",
  "« Le vin est le professeur du goût. » — Paul Claudel",
  "On fouille les caves pour vous... 🍷",
  "Décantation des résultats en cours... 🍾",
  "Le sommelier consulte ses notes... 📝",
];

// ── Clés localStorage — catégories de vins ──────────────────
export const CAT_KEYS: Record<WineCategory, string> = {
  tasted:   'cepage_tasted',
  liked:    'cepage_liked',
  favorite: 'cepage_favorite',
  cellar:   'cepage_cellar',
};

/** Clé localStorage des favoris (ancienne feature) */
export const FAV_KEY = 'cepage_favorites';

// ── Navigation ───────────────────────────────────────────────
/** Pages dont le hash URL est persisté au rechargement (F5) */
export const HASH_PAGES: Page[] = ['visite', 'events', 'favorites', 'account', 'admin', 'login'];

// ── Mode Visite ──────────────────────────────────────────────
/**
 * ID du salon courant — à mettre à jour pour chaque nouveau salon.
 * Détermine quel fichier JSON est chargé : public/exposants-{VISITE_EVENT_ID}.json
 */
export const VISITE_EVENT_ID = 'vi-bordeaux-2026';

// ── Régions viticoles (Mode Visite) ─────────────────────────
/** Emojis par région pour l'interface du Mode Visite */
export const REGION_EMOJIS: Record<string, string> = {
  'Bordeaux': '🏰',
  'Bourgogne': '🍇',
  'Champagne': '🥂',
  'Alsace': '🌹',
  'Rhône': '🌊',
  'Vallée du Rhône': '🌊',
  'Loire': '🌻',
  'Languedoc': '☀️',
  'Provence': '🌿',
  'Roussillon': '🏔️',
  'Sud-Ouest': '🌾',
  'Beaujolais': '🍷',
  'Savoie': '🏔️',
  'Jura': '🌲',
  'Corse': '🏝️',
};
