/**
 * ═══════════════════════════════════════════════════════════
 * types/index.ts — Tous les types TypeScript du projet Cépage
 * ═══════════════════════════════════════════════════════════
 *
 * Centralise les types partagés entre les pages et composants.
 * Importer depuis ici plutôt que de re-déclarer dans chaque fichier.
 */

// Re-exports depuis les libs existantes
export type { WineResult, WineVintage } from '../lib/wineSearch';
export type { AuthUser } from '../lib/auth';
export type { WineEvent } from '../lib/events';

// ── Navigation ───────────────────────────────────────────────
/** Pages disponibles dans l'application */
export type Page =
  | 'home'
  | 'search'
  | 'events'
  | 'visite'
  | 'admin'
  | 'favorites'
  | 'account'
  | 'login'
  | 'register'
  | 'verify-email'
  | 'reset-password'
  | 'selection-sommelier';

// ── Drag & Drop — catégories de vins ────────────────────────
/** Les 4 bacs de catégorisation des vins */
export type WineCategory = 'tasted' | 'liked' | 'favorite' | 'cellar';

/** Données minimales d'un vin stocké dans un bac (localStorage) */
export interface WineCardData {
  wineName: string;
  year: number;
  stars: number;
  region?: string;
  appellation?: string;
  image?: string;
  /** URL de la fiche Hachette pour accéder aux détails */
  url?: string;
  /** Timestamp de l'ajout */
  addedAt: number;
}

// ── Modal détail vin ─────────────────────────────────────────
/** Réponse de l'API /api/wine/detail */
export type WineDetailData = {
  ok: boolean;
  url: string;
  image?: string;
  wine_name?: string;
  year?: number;
  subtitle?: string;
  region?: string;
  appellation?: string;
  stars?: number;
  coup_de_coeur?: boolean;
  wine_type_label?: string;
  a_boire?: string;
  elevage?: string;
  garde?: string;
  temperature?: string;
  producer_url?: string;
};

// ── Mode Visite ──────────────────────────────────────────────
/** Un exposant du salon (données depuis le JSON public/) */
export interface ExposantData {
  stand: string;
  name: string;
  viPath: string;
  region: string;
  hasDbMatch: boolean;
  producerCode: string;
  producerNameDb: string;
  /** Résultats de recherche de vins associés à cet exposant */
  wineResults: import('../lib/wineSearch').WineResult[];
}

/** Structure du fichier JSON exposants-{eventId}.json */
export interface ExposantsData {
  eventId: string;
  eventName?: string;
  location?: string;
  dates?: string;
  generatedAt: string;
  totalExposants: number;
  matchesFound: number;
  noMatches: number;
  exposants: ExposantData[];
  type?: 'salon' | 'portes-ouvertes';
}

// ── Admin ────────────────────────────────────────────────────
/** Statut retourné par /api/status */
export interface BackendStatus {
  ok: boolean;
  scrapling: boolean;
  db_stats: {
    producers: number;
    vintages: number;
    last_scrape: {
      scrape_type: string;
      started_at: string;
      finished_at: string;
      status: string;
    } | null;
  };
  scraping_now: boolean;
}

/** Progression d'un scrape en cours (SSE) */
export interface ScrapeProgress {
  running: boolean;
  type: string | null;
  percent: number;
  phase: string;
  detail: string;
  producers: number;
  vintages: number;
  error: string | null;
}

/** Utilisateur affiché dans le panneau admin */
export type SiteUser = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  email_verified: number;
  created_at: string;
};
