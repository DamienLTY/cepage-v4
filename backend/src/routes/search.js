const express = require('express');
const router = express.Router();
const { searchWinesDb, searchProducerDb, searchRegionDb } = require('../lib/wineSearch');

// GET /api/search?q=...&limit=20
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ ok: false, error: 'Paramètre q requis' });

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));

  try {
    const results = searchWinesDb(q, limit);
    res.json({ ok: true, results, total: results.length });
  } catch (err) {
    console.error('[search]', err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la recherche.' });
  }
});

// GET /api/producer?q=...&limit=50
router.get('/producer', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ ok: false, error: 'Paramètre q requis' });

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));

  try {
    const { results, total } = searchProducerDb(q, limit);
    const page = 1;
    const pages = Math.ceil(total / limit);
    res.json({ ok: true, results, total, page, pages });
  } catch (err) {
    console.error('[producer]', err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la recherche producteur.' });
  }
});

// GET /api/region?r=...&page=1&limit=50
router.get('/region', (req, res) => {
  const r = (req.query.r || '').trim();
  if (!r) return res.status(400).json({ ok: false, error: 'Paramètre r requis' });

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));

  try {
    const { results, total, pages } = searchRegionDb(r, page, limit);
    res.json({ ok: true, results, total, page, pages });
  } catch (err) {
    console.error('[region]', err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la recherche par région.' });
  }
});

module.exports = router;
