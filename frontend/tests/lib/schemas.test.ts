import { describe, it, expect } from 'vitest';
import {
  VintageSchema,
  SearchResultSchema,
  SearchResponseSchema,
  WineByProducerResponseSchema,
  BackendStatusSchema,
  AuthUserSchema,
  AuthResponseSchema,
  safeParse,
} from '../../src/lib/schemas';

describe('schemas.ts', () => {
  describe('VintageSchema', () => {
    it('should validate correct vintage data', () => {
      const validVintage = {
        year: 2020,
        stars: 3,
        wine_name: 'Château Margaux',
        color: 'red',
      };
      const result = VintageSchema.safeParse(validVintage);
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const vintageWithOptional = {
        year: 2019,
        stars: 2,
        wine_name: 'Bordeaux Wine',
        color: 'white',
        wine_type: 'Sec',
        link: 'https://example.com',
      };
      const result = VintageSchema.safeParse(vintageWithOptional);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const incomplete = {
        year: 2020,
        stars: 2,
      };
      const result = VintageSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('should reject invalid star rating', () => {
      const invalidStars = {
        year: 2020,
        stars: 5, // Max is 3
        wine_name: 'Test Wine',
        color: 'red',
      };
      const result = VintageSchema.safeParse(invalidStars);
      expect(result.success).toBe(false);
    });

    it('should reject negative year', () => {
      const negativeYear = {
        year: -2020,
        stars: 2,
        wine_name: 'Test Wine',
        color: 'red',
      };
      const result = VintageSchema.safeParse(negativeYear);
      expect(result.success).toBe(false);
    });

    it('should set default values for optional fields', () => {
      const minimal = {
        year: 2021,
        stars: 1,
        wine_name: 'Wine',
        color: 'rosé',
      };
      const result = VintageSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.wine_type).toBe('');
        expect(result.data.link).toBe('');
      }
    });
  });

  describe('SearchResultSchema', () => {
    it('should validate correct search result', () => {
      const validResult = {
        foundName: 'Château Margaux',
        producerName: 'Margaux Estate',
        producerUrl: 'https://example.com',
        concordance: 95,
        producerCode: 'MARG-001',
        region: 'Bordeaux',
        vintages: [
          {
            year: 2020,
            stars: 3,
            name: 'Château Margaux',
            color: 'red',
            type: 'AOC',
            link: 'https://example.com/wine',
            isEffervescent: false,
          },
        ],
      };
      const result = SearchResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should handle optional producer fields', () => {
      const minimalResult = {
        foundName: 'Wine',
        concordance: 80,
        producerCode: null,
        vintages: [],
      };
      const result = SearchResultSchema.safeParse(minimalResult);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const incomplete = {
        foundName: 'Wine',
        // missing concordance and vintages
      };
      const result = SearchResultSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('should set default isEffervescent to false', () => {
      const result = SearchResultSchema.safeParse({
        foundName: 'Wine',
        concordance: 90,
        producerCode: null,
        vintages: [
          {
            year: 2020,
            stars: 2,
            name: 'Wine',
            color: 'white',
            type: 'Dry',
            link: 'https://example.com',
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vintages[0].isEffervescent).toBe(false);
      }
    });
  });

  describe('SearchResponseSchema', () => {
    it('should validate successful search response', () => {
      const validResponse = {
        ok: true,
        results: [
          {
            foundName: 'Wine 1',
            concordance: 95,
            producerCode: null,
            vintages: [],
          },
        ],
      };
      const result = SearchResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should handle empty results', () => {
      const emptyResponse = {
        ok: true,
        results: [],
      };
      const result = SearchResponseSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.results).toHaveLength(0);
      }
    });

    it('should validate error response', () => {
      const errorResponse = {
        ok: false,
        error: 'Search failed',
      };
      const result = SearchResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('WineByProducerResponseSchema', () => {
    it('should validate response with vintages', () => {
      const response = {
        ok: true,
        vintages: [
          {
            year: 2020,
            stars: 3,
            wine_name: 'Wine',
            color: 'red',
          },
        ],
      };
      const result = WineByProducerResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should handle empty vintages array', () => {
      const response = {
        ok: true,
        vintages: [],
      };
      const result = WineByProducerResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject missing ok field', () => {
      const invalid = {
        vintages: [],
      };
      const result = WineByProducerResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('AuthUserSchema', () => {
    it('should validate correct user data', () => {
      const validUser = {
        id: 1,
        email: 'user@example.com',
        username: 'johndoe',
        role: 'user',
        verified: true,
      };
      const result = AuthUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidEmail = {
        id: 1,
        email: 'not-an-email',
        username: 'user',
      };
      const result = AuthUserSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
    });

    it('should set default role to user', () => {
      const result = AuthUserSchema.safeParse({
        id: 2,
        email: 'test@example.com',
        username: 'testuser',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('user');
      }
    });

    it('should validate admin role', () => {
      const adminUser = {
        id: 3,
        email: 'admin@example.com',
        username: 'admin',
        role: 'admin',
      };
      const result = AuthUserSchema.safeParse(adminUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('admin');
      }
    });

    it('should reject invalid role', () => {
      const invalidRole = {
        id: 4,
        email: 'user@example.com',
        username: 'user',
        role: 'superuser',
      };
      const result = AuthUserSchema.safeParse(invalidRole);
      expect(result.success).toBe(false);
    });
  });

  describe('AuthResponseSchema', () => {
    it('should validate successful auth response', () => {
      const validResponse = {
        ok: true,
        token: 'jwt-token-123',
        user: {
          id: 1,
          email: 'user@example.com',
          username: 'user',
        },
      };
      const result = AuthResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should handle auth failure', () => {
      const failureResponse = {
        ok: false,
        error: 'Invalid credentials',
      };
      const result = AuthResponseSchema.safeParse(failureResponse);
      expect(result.success).toBe(true);
    });

    it('should make token and user optional', () => {
      const minimalResponse = {
        ok: false,
      };
      const result = AuthResponseSchema.safeParse(minimalResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('BackendStatusSchema', () => {
    it('should validate correct status response', () => {
      const validStatus = {
        ok: true,
        scrapling: false,
        scraping_now: false,
        db_stats: {
          producers: 1000,
          vintages: 5000,
          last_scrape: null,
        },
      };
      const result = BackendStatusSchema.safeParse(validStatus);
      expect(result.success).toBe(true);
    });

    it('should validate status with scrape history', () => {
      const statusWithScrape = {
        ok: true,
        scrapling: true,
        scraping_now: true,
        db_stats: {
          producers: 1000,
          vintages: 5000,
          last_scrape: {
            scrape_type: 'hachette',
            started_at: '2026-03-21T10:00:00Z',
            finished_at: '2026-03-21T12:00:00Z',
            status: 'completed',
          },
        },
      };
      const result = BackendStatusSchema.safeParse(statusWithScrape);
      expect(result.success).toBe(true);
    });

    it('should reject missing db_stats', () => {
      const invalid = {
        ok: true,
        scrapling: false,
        scraping_now: false,
      };
      const result = BackendStatusSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('safeParse helper', () => {
    it('should return parsed data on success', () => {
      const validVintage = {
        year: 2020,
        stars: 2,
        wine_name: 'Wine',
        color: 'red',
      };
      const result = safeParse(VintageSchema, validVintage);
      expect(result).toEqual(validVintage);
    });

    it('should return null on validation failure', () => {
      const invalidVintage = {
        year: 'not-a-number',
        stars: 2,
        wine_name: 'Wine',
        color: 'red',
      };
      const result = safeParse(VintageSchema, invalidVintage);
      expect(result).toBeNull();
    });

    it('should return null for corrupted data', () => {
      const result = safeParse(VintageSchema, null);
      expect(result).toBeNull();
    });

    it('should return null for wrong type', () => {
      const result = safeParse(SearchResultSchema, 'not-an-object');
      expect(result).toBeNull();
    });
  });
});
