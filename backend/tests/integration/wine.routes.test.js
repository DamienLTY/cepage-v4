const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock Prisma
jest.mock('../../src/lib/prisma', () => require('../helpers/mockPrisma'));
const { prismaMock } = require('../helpers/mockPrisma');

// Mock config
jest.mock('../../src/config', () => ({
  JWT_SECRET: 'test-secret-key',
  JWT_EXPIRES_IN: '30d',
}));

// Mock scrapeWineDetail
jest.mock('../../src/lib/scrapeWineDetail', () => ({
  getWineDetail: jest.fn(),
}));

// Mock wineSearch
jest.mock('../../src/lib/wineSearch', () => ({
  getProducerVintages: jest.fn(),
  searchWinesDb: jest.fn(),
  searchProducerDb: jest.fn(),
  searchRegionDb: jest.fn(),
  normalize: jest.fn((s) => (s || '').toLowerCase()),
}));

const { getWineDetail } = require('../../src/lib/scrapeWineDetail');
const { getProducerVintages } = require('../../src/lib/wineSearch');
const wineRouter = require('../../src/routes/wine');
const config = require('../../src/config');

describe('Wine Routes', () => {
  let app, validToken, adminToken;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', wineRouter);

    // Créer tokens valides pour les tests
    validToken = jwt.sign(
      { sub: 'user-123', email: 'user@example.com', role: 'user' },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );

    adminToken = jwt.sign(
      { sub: 'admin-123', email: 'admin@example.com', role: 'admin' },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Setup mock pour l'authentification
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
      emailVerified: true,
      displayName: 'Admin User',
    });
  });

  describe('GET /api/wine/detail', () => {
    it('should return 400 when url parameter is missing', async () => {
      const res = await request(app).get('/api/wine/detail');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        ok: false,
        error: 'URL Hachette invalide',
      });
    });

    it('should return 400 when url is empty', async () => {
      const res = await request(app).get('/api/wine/detail?url=');

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('should return 400 when url does not contain hachette-vins.com', async () => {
      const res = await request(app).get('/api/wine/detail?url=https://google.com');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        ok: false,
        error: 'URL Hachette invalide',
      });
    });

    it('should call getWineDetail when URL is valid', async () => {
      const mockResult = {
        ok: true,
        data: {
          title: 'Test Wine',
          vintage: 2020,
        },
      };
      getWineDetail.mockResolvedValue(mockResult);

      const res = await request(app).get(
        '/api/wine/detail?url=https://www.hachette-vins.com/test'
      );

      expect(getWineDetail).toHaveBeenCalledWith(
        'https://www.hachette-vins.com/test'
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
    });

    it('should return 502 when scraping fails', async () => {
      const mockResult = {
        ok: false,
        error: 'Failed to scrape',
      };
      getWineDetail.mockResolvedValue(mockResult);

      const res = await request(app).get(
        '/api/wine/detail?url=https://www.hachette-vins.com/invalid'
      );

      expect(res.status).toBe(502);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /api/wine/:producerCode', () => {
    it('should return wine data for valid producer code', async () => {
      const mockData = {
        producer: {
          code: 'prod-123',
          name: 'Château Test',
          region: 'Bordeaux',
        },
        vintages: [
          {
            year: 2020,
            stars: 4,
            color: 'Rouge',
          },
        ],
      };
      getProducerVintages.mockResolvedValue(mockData);

      const res = await request(app).get('/api/wine/prod-123');

      expect(getProducerVintages).toHaveBeenCalledWith('prod-123');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        ok: true,
        producer: mockData.producer,
        vintages: mockData.vintages,
      });
    });

    it('should return 404 when producer is not found', async () => {
      getProducerVintages.mockResolvedValue(null);

      const res = await request(app).get('/api/wine/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        ok: false,
        error: 'Producteur introuvable',
      });
    });

    it('should handle errors gracefully', async () => {
      getProducerVintages.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/wine/prod-error');

      expect(res.status).toBe(500);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/admin/fix-colors', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).post('/api/admin/fix-colors');

      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    it('should return 403 when user is not admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
        emailVerified: true,
        displayName: 'Regular User',
      });

      const userToken = jwt.sign(
        { sub: 'user-123', email: 'user@example.com', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '30d' }
      );

      const res = await request(app)
        .post('/api/admin/fix-colors')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });

    it('should allow admin to fix colors', async () => {
      prismaMock.wineDetail.findMany.mockResolvedValue([
        {
          url: 'https://example.com/wine1',
          data: JSON.stringify({
            wine_type_label: 'Vin Rouge',
          }),
        },
      ]);
      prismaMock.vintage.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/admin/fix-colors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body).toHaveProperty('checked');
      expect(res.body).toHaveProperty('fixed');
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/admin/color-conflicts', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/admin/color-conflicts');

      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
    });

    it('should return 403 when user is not admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
        emailVerified: true,
        displayName: 'Regular User',
      });

      const userToken = jwt.sign(
        { sub: 'user-123', email: 'user@example.com', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '30d' }
      );

      const res = await request(app)
        .get('/api/admin/color-conflicts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });

    it('should return color conflicts for admin', async () => {
      prismaMock.$queryRaw.mockResolvedValue([
        {
          link: 'https://example.com/wine1',
          color_count: 2,
          colors: ['Rouge', 'Rosé'],
        },
      ]);

      prismaMock.vintage.findMany.mockResolvedValue([
        { id: 1, wineName: 'Wine 1', color: 'Rouge' },
        { id: 2, wineName: 'Wine 1', color: 'Rosé' },
      ]);

      const res = await request(app)
        .get('/api/admin/color-conflicts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('conflicts');
      expect(Array.isArray(res.body.conflicts)).toBe(true);
    });
  });
});
