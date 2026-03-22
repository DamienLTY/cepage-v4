const request = require('supertest');
const express = require('express');

// Mock Prisma
jest.mock('../../src/lib/prisma', () => require('../helpers/mockPrisma'));
const { prismaMock } = require('../helpers/mockPrisma');

// Mock axios for test-connection endpoint
jest.mock('axios');
const axios = require('axios');

const statusRouter = require('../../src/routes/status');

describe('Status Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(statusRouter);
  });

  describe('GET /', () => {
    it('should return service info with default status', async () => {
      prismaMock.producer.count.mockResolvedValue(100);
      prismaMock.vintage.count.mockResolvedValue(1000);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'Cépage Backend');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('runtime');
      expect(res.body).toHaveProperty('endpoints');
      expect(Array.isArray(res.body.endpoints)).toBe(true);
    });

    it('should include db_stats when available', async () => {
      prismaMock.producer.count.mockResolvedValue(50);
      prismaMock.vintage.count.mockResolvedValue(500);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.db_stats).toEqual({
        producers: 50,
        vintages: 500,
      });
    });

    it('should handle database error gracefully', async () => {
      prismaMock.producer.count.mockRejectedValue(new Error('DB Error'));
      prismaMock.vintage.count.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.db_stats).toEqual({});
    });
  });

  describe('GET /api/status', () => {
    it('should return ok: true and db_ok: true when DB is accessible', async () => {
      prismaMock.producer.count.mockResolvedValue(100);
      prismaMock.vintage.count.mockResolvedValue(1000);

      const res = await request(app).get('/api/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        ok: true,
        version: '2.0.0',
        runtime: 'Node.js/Express + Prisma (PostgreSQL uniquement)',
        db_ok: true,
        db_stats: {
          producers: 100,
          vintages: 1000,
        },
        auth_db: 'postgresql',
      });
    });

    it('should return db_ok: false when database fails', async () => {
      prismaMock.producer.count.mockRejectedValue(new Error('Connection timeout'));
      prismaMock.vintage.count.mockRejectedValue(new Error('Connection timeout'));

      const res = await request(app).get('/api/status');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.db_ok).toBe(false);
      expect(res.body.db_stats).toEqual({});
    });

    it('should include version and runtime info', async () => {
      prismaMock.producer.count.mockResolvedValue(50);
      prismaMock.vintage.count.mockResolvedValue(500);

      const res = await request(app).get('/api/status');

      expect(res.status).toBe(200);
      expect(res.body.version).toBe('2.0.0');
      expect(res.body.runtime).toContain('Node.js/Express');
      expect(res.body.auth_db).toBe('postgresql');
    });
  });

  describe('GET /api/test-connection', () => {
    it('should return ok: true when connection to Hachette succeeds', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: '<html>test</html>',
      });

      const res = await request(app).get('/api/test-connection');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.url).toBe('https://www.hachette-vins.com/');
      expect(res.body.indicators).toHaveProperty('html_size');
      expect(res.body.indicators).toHaveProperty('response_time');
      expect(res.body.indicators).toHaveProperty('status', 200);
    });

    it('should return ok: false when connection fails', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const res = await request(app).get('/api/test-connection');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should include response_time indicator', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: 'content',
      });

      const res = await request(app).get('/api/test-connection');

      expect(res.status).toBe(200);
      expect(res.body.indicators.response_time).toBeGreaterThanOrEqual(0);
    });
  });
});
