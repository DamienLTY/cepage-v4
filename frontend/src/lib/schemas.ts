/**
 * Schemas Zod pour valider les réponses du backend Flask.
 * Si le backend change de shape, les erreurs sont détectées à parse() et non à runtime.
 */
import { z } from 'zod';

// ── Vin / Millésime ────────────────────────────────────────────

export const VintageSchema = z.object({
  year:       z.number(),
  stars:      z.number().min(0).max(3),
  wine_name:  z.string(),
  color:      z.string(),
  wine_type:  z.string().optional().default(''),
  link:       z.string().optional().default(''),
});
export type VintageRaw = z.infer<typeof VintageSchema>;

// ── Réponse /api/search ────────────────────────────────────────

export const SearchResultSchema = z.object({
  foundName:    z.string(),
  producerName: z.string().optional(),
  producerUrl:  z.string().optional(),
  concordance:  z.number(),
  producerCode: z.string().nullable(),
  region:       z.string().optional(),
  vintages:     z.array(z.object({
    year:   z.number(),
    stars:  z.number(),
    name:   z.string(),
    color:  z.string(),
    type:   z.string(),
    link:   z.string(),
    isEffervescent: z.boolean().optional().default(false),
  })),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  ok:      z.boolean(),
  results: z.array(SearchResultSchema).optional().default([]),
  error:   z.string().optional(),
});

// ── Réponse /api/wine/<code> ────────────────────────────────────

export const WineByProducerResponseSchema = z.object({
  ok:       z.boolean(),
  vintages: z.array(VintageSchema).optional().default([]),
  error:    z.string().optional(),
});

// ── Réponse /api/status ────────────────────────────────────────
// Doit correspondre à l'interface BackendStatus dans src/types/index.ts

const LastScrapeSchema = z.object({
  scrape_type: z.string(),
  started_at:  z.string(),
  finished_at: z.string(),
  status:      z.string(),
}).nullable();

export const BackendStatusSchema = z.object({
  ok:          z.boolean(),
  scrapling:   z.boolean(),
  scraping_now: z.boolean(),
  db_stats: z.object({
    producers:  z.number(),
    vintages:   z.number(),
    last_scrape: LastScrapeSchema,
  }),
});

// ── Auth ──────────────────────────────────────────────────────

export const AuthUserSchema = z.object({
  id:       z.number(),
  email:    z.string().email(),
  username: z.string(),
  role:     z.enum(['user', 'admin']).optional().default('user'),
  verified: z.boolean().optional().default(false),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  ok:    z.boolean(),
  token: z.string().optional(),
  user:  AuthUserSchema.optional(),
  error: z.string().optional(),
});

// ── Helpers de parsing sûr ────────────────────────────────────

/**
 * Parse une réponse et retourne null si le schema ne matche pas
 * (au lieu de lever une exception — comportement dégradé gracieux).
 */
export function safeParse<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  console.warn('[Cépage] Schema validation failed:', result.error.issues);
  return null;
}
