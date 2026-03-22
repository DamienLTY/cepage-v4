const express = require('express');
const router = express.Router();
const { getWineDetail } = require('../lib/scrapeWineDetail');
const { getProducerVintages } = require('../lib/wineSearch');
const { prisma } = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/wine/detail?url=... — AVANT /:producerCode
router.get('/wine/detail', async (req, res) => {
  const url = (req.query.url || '').trim();
  // SÉCURITÉ (VULN-16) : validation SSRF stricte — hostname + protocole
  try {
    const parsed = new URL(url);
    if (!['www.hachette-vins.com', 'hachette-vins.com'].includes(parsed.hostname)) {
      return res.status(400).json({ ok: false, error: 'URL Hachette invalide' });
    }
    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ ok: false, error: 'URL Hachette invalide' });
    }
  } catch {
    return res.status(400).json({ ok: false, error: 'URL Hachette invalide' });
  }
  try {
    const result = await getWineDetail(url);
    res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    console.error('[wine/detail]', err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la récupération des détails du vin.' });
  }
});

// GET /api/wine/:producerCode
router.get('/wine/:producerCode', async (req, res) => {
  try {
    const data = await getProducerVintages(req.params.producerCode);
    if (!data) return res.status(404).json({ ok: false, error: 'Producteur introuvable' });
    res.json({ ok: true, producer: data.producer, vintages: data.vintages });
  } catch (err) {
    console.error('[wine/producer]', err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la récupération du producteur.' });
  }
});

// POST /api/admin/fix-colors
router.post('/admin/fix-colors', requireAuth, requireAdmin, async (req, res) => {
  let checked = 0, fixed = 0, errors = 0;
  try {
    const details = await prisma.wineDetail.findMany({ select: { url: true, data: true } });
    for (const row of details) {
      checked++;
      try {
        const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        const wt = (d.wine_type_label || '').toLowerCase();
        let color = '';
        if (wt.includes('rouge')) color = 'Rouge';
        else if (wt.includes('blanc')) color = 'Blanc';
        else if (wt.includes('ros')) color = 'Rosé';
        if (!color) continue;
        const result = await prisma.vintage.updateMany({
          where: { link: row.url, NOT: { color } },
          data: { color },
        });
        if (result.count > 0) fixed++;
      } catch { errors++; }
    }
    res.json({ ok: true, checked, fixed, errors });
  } catch (err) {
    console.error('[fix-colors]', err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la correction des couleurs.' });
  }
});

// GET /api/admin/color-conflicts
router.get('/admin/color-conflicts', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Trouver les URLs ayant plusieurs couleurs différentes
    const conflicts = await prisma.$queryRaw`
      SELECT link, COUNT(DISTINCT color) as color_count,
             ARRAY_AGG(DISTINCT color) as colors
      FROM vintages
      WHERE link IS NOT NULL AND link != ''
      GROUP BY link
      HAVING COUNT(DISTINCT color) > 1
    `;
    const result = await Promise.all(conflicts.map(async c => ({
      link: c.link,
      colors: c.colors,
      entries: await prisma.vintage.findMany({
        where: { link: c.link },
        select: { id: true, wineName: true, color: true },
      }),
    })));
    res.json({ ok: true, count: result.length, conflicts: result });
  } catch (err) {
    console.error('[color-conflicts]', err);
    res.status(500).json({ ok: false, error: 'Erreur lors de la recherche de conflits.' });
  }
});

// POST /api/admin/fix-color-conflicts
router.post('/admin/fix-color-conflicts', requireAuth, requireAdmin, async (req, res) => {
  let fixed = 0, skipped = 0;
  try {
    const conflicts = await prisma.$queryRaw`
      SELECT link FROM vintages
      WHERE link IS NOT NULL AND link != ''
      GROUP BY link HAVING COUNT(DISTINCT color) > 1
    `;
    for (const { link } of conflicts) {
      const detail = await prisma.wineDetail.findUnique({ where: { url: link } });
      let targetColor = null;
      if (detail) {
        const d = typeof detail.data === 'string' ? JSON.parse(detail.data) : detail.data;
        const wt = (d.wine_type_label || '').toLowerCase();
        if (wt.includes('rouge')) targetColor = 'Rouge';
        else if (wt.includes('blanc')) targetColor = 'Blanc';
        else if (wt.includes('ros')) targetColor = 'Rosé';
      }
      if (!targetColor) {
        const majority = await prisma.$queryRaw`
          SELECT color, COUNT(*) as cnt FROM vintages WHERE link = ${link}
          GROUP BY color ORDER BY cnt DESC LIMIT 1
        `;
        if (majority[0]) targetColor = majority[0].color;
      }
      if (!targetColor) { skipped++; continue; }
      await prisma.vintage.deleteMany({ where: { link, NOT: { color: targetColor } } });
      fixed++;
    }
    res.json({ ok: true, fixed, skipped });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
