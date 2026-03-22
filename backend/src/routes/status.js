const express = require('express');
const router = express.Router();
const axios = require('axios');
const { prisma } = require('../lib/prisma');
const config = require('../config');

router.get('/', async (req, res) => {
  let db_stats = {};
  try {
    const [producers, vintages] = await Promise.all([
      prisma.producer.count(),
      prisma.vintage.count(),
    ]);
    db_stats = { producers, vintages };
  } catch {}
  res.json({
    service: 'Cépage Backend',
    version: '2.0.0',
    runtime: 'Node.js/Express + Prisma',
    db_stats,
    endpoints: ['/api/search', '/api/producer', '/api/region', '/api/wine', '/api/auth', '/api/visite', '/api/status'],
  });
});

router.get('/api/status', async (req, res) => {
  let db_stats = {};
  let db_ok = false;
  try {
    const [producers, vintages] = await Promise.all([
      prisma.producer.count(),
      prisma.vintage.count(),
    ]);
    db_stats = { producers, vintages };
    db_ok = true;
  } catch {}
  res.json({
    ok: true,
    version: '2.0.0',
    runtime: 'Node.js/Express + Prisma (PostgreSQL uniquement)',
    db_ok,
    db_stats,
    auth_db: 'postgresql',
  });
});

router.get('/api/test-connection', async (req, res) => {
  const url = 'https://www.hachette-vins.com/';
  const start = Date.now();
  try {
    const resp = await axios.get(url, { timeout: 10000 });
    res.json({ ok: true, url, indicators: { html_size: resp.data.length, response_time: Date.now() - start, status: resp.status }, message: 'Connexion Hachette OK' });
  } catch (err) {
    res.json({ ok: false, url, error: err.message });
  }
});

module.exports = router;
