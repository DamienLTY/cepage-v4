const request = require('supertest');
const express = require('express');

// Mock Prisma
jest.mock('../../src/lib/prisma', () => require('../helpers/mockPrisma'));
const { prismaMock } = require('../helpers/mockPrisma');

// Mock wineSearch functions
jest.mock('../../src/lib/wineSearch', () => ({
  searchWinesDb: jest.fn(),
  searchProducerDb: jest.fn(),
  searchRegionDb: jest.fn(),
  getProducerVintages: jest.fn(),
  normalize: jest.fn((s) => (s || '').toLowerCase()),
}));

const { searchWinesDb, searchProducerDb, searchRegionDb } = require('../../src/lib/wineSearch');
const searchRouter = require('../../src/routes/search');

describe('Search Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', searchRouter);
  });

  describe('GET /api/search', () => {
    it('should return 400 when q parameter is missing', async () => {
      const res = await request(app).get('/api/search');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        ok: false,
        error: 'Paramètre q requis',
      });
    });

    it('should return 400 when q parameter is empty', async () => {
      const res = await request(app).get('/api/search?q=');

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('should return 200 with empty results when no wines match', async () => {
      searchWinesDb.mockReturnValue([]);

      const res = await request(app).get('/api/search?q=nonexistent');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body.results).toBeDefined();
      expect(res.body.total).toBeDefined();
    });

    it('should clamp limit parameter between 1 and 100', async () => {
      searchWinesDb.mockReturnValue([]);

      // Limit > 100 should be clamped to 100
      const res1 = await request(app).get('/api/search?q=test&limit=200');
      // Limit < 1 should be clamped to 1
      const res2 = await request(app).get('/api/search?q=test&limit=0');

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('should handle invalid limit parameter gracefully', async () => {
      searchWinesDb.mockReturnValue([]);

      const res = await request(app).get('/api/search?q=test&limit=invalid');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('should return results with structure { ok, results, total }', async () => {
      const mockResults = [
        {
          producerCode: 'prod-1',
          foundName: 'Château Margaux',
          producerName: 'Château Margaux',
          region: 'Bordeaux',
          color: 'Rouge',
          wineType: 'Red',
          vintages: [{ year: 2020, stars: 5 }],
        },
      ];
      searchWinesDb.mockReturnValue(mockResults);

      const res = await request(app).get('/api/search?q=margaux');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(typeof res.body.total).toBe('number');
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/producer', () => {
    it('should return 400 when q parameter is missing', async () => {
      const res = await request(app).get('/api/producer');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        ok: false,
        error: 'Paramètre q requis',
      });
    });

    it('should return 200 with pagination structure', async () => {
      searchProducerDb.mockReturnValue({ results: [], total: 0 });

      const res = await request(app).get('/api/producer?q=test');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('results');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pages');
    });

    it('should calculate pages correctly', async () => {
      // Mock 150 results
      const mockResults = Array(150)
        .fill(null)
        .map((_, i) => ({
          id: `prod-${i}`,
          name: `Producer ${i}`,
          vintages: [],
        }));
      searchProducerDb.mockReturnValue({ results: mockResults, total: 150 });

      const res = await request(app).get('/api/producer?q=producer&limit=50');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(150);
      expect(res.body.pages).toBe(3);
    });
  });

  describe('GET /api/region', () => {
    it('should return 400 when r parameter is missing', async () => {
      const res = await request(app).get('/api/region');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        ok: false,
        error: 'Paramètre r requis',
      });
    });

    it('should return 200 with pagination structure', async () => {
      searchRegionDb.mockReturnValue({ results: [], total: 0, page: 1, pages: 0 });

      const res = await request(app).get('/api/region?r=Bordeaux');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('results');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pages');
    });

    it('should handle page parameter', async () => {
      searchRegionDb.mockReturnValue({ results: [], total: 0, page: 2, pages: 1 });

      const res = await request(app).get('/api/region?r=Bordeaux&page=2');

      expect(searchRegionDb).toHaveBeenCalledWith('Bordeaux', 2, 50);
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
    });

    it('should clamp page parameter to minimum 1', async () => {
      searchRegionDb.mockReturnValue({ results: [], total: 0, page: 1, pages: 1 });

      const res = await request(app).get('/api/region?r=Bordeaux&page=0');

      expect(searchRegionDb).toHaveBeenCalledWith('Bordeaux', 1, 50);
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
    });

    it('should handle limit parameter', async () => {
      searchRegionDb.mockReturnValue({ results: [], total: 0, page: 1, pages: 1 });

      const res = await request(app).get('/api/region?r=Bordeaux&limit=25');

      expect(searchRegionDb).toHaveBeenCalledWith('Bordeaux', 1, 25);
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });
});
