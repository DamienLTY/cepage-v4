const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const config = require('../config');
const { spawn } = require('child_process');
const prisma = require('../lib/prisma');

// GET /api/visite/exposants/:eventId
// Retourne le JSON exposants-{eventId}.json depuis frontend/public/
router.get('/visite/exposants/:eventId', (req, res) => {
  const { eventId } = req.params;
  // Validation : seulement lettres, chiffres, tirets
  if (!/^[a-z0-9\-]{3,60}$/.test(eventId)) {
    return res.status(400).json({ ok: false, error: 'eventId invalide' });
  }

  const filePath = path.join(config.FRONTEND_PUBLIC, `exposants-${eventId}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: `Salon "${eventId}" non trouvé` });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Erreur lecture fichier' });
  }
});

// GET /api/visite/list
// Liste tous les salons disponibles (fichiers exposants-*.json)
router.get('/visite/list', (req, res) => {
  try {
    const files = fs.readdirSync(config.FRONTEND_PUBLIC)
      .filter(f => f.startsWith('exposants-') && f.endsWith('.json'));

    const salons = [];
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(config.FRONTEND_PUBLIC, file), 'utf8'));
        salons.push({
          eventId: data.eventId,
          eventName: data.eventName,
          location: data.location,
          dates: data.dates,
          totalExposants: data.totalExposants,
          matchesFound: data.matchesFound,
          generatedAt: data.generatedAt,
        });
      } catch {}
    }

    res.json({ ok: true, salons });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/admin/visite/scrape
// Lance scrape_exposants.py en subprocess
router.post('/admin/visite/scrape', requireAuth, requireAdmin, (req, res) => {
  const { contentId, eventId, eventName, location, dates } = req.body;
  if (!contentId || !eventId) {
    return res.status(400).json({ ok: false, error: 'contentId et eventId requis' });
  }

  const scriptPath = path.join(config.BACKEND_DIR, 'scrape_exposants.py');
  const outputFile = path.join(config.FRONTEND_PUBLIC, `exposants-${eventId}.json`);

  const args = [
    scriptPath,
    '--content-id', String(contentId),
    '--event-id', eventId,
    '--output', outputFile,
  ];
  if (eventName) args.push('--event-name', eventName);
  if (location) args.push('--location', location);
  if (dates) args.push('--dates', dates);

  const child = spawn(config.PYTHON_BIN, args, {
    cwd: config.BACKEND_DIR,
    timeout: 300000, // 5 min
  });

  let output = '';
  let errOutput = '';
  child.stdout.on('data', d => { output += d.toString(); });
  child.stderr.on('data', d => { errOutput += d.toString(); });

  child.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ ok: false, error: errOutput || 'Scraping failed', code });
    }
    try {
      const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      res.json({
        ok: true,
        eventId,
        stats: {
          totalExposants: data.totalExposants,
          matchesFound: data.matchesFound,
          noMatches: data.totalExposants - (data.matchesFound || 0),
        },
        outputFile,
        generatedAt: data.generatedAt,
      });
    } catch {
      res.json({ ok: true, eventId, message: output });
    }
  });

  child.on('error', (err) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

// GET /api/admin/visite/list
router.get('/admin/visite/list', requireAuth, requireAdmin, (req, res) => {
  try {
    const files = fs.readdirSync(config.FRONTEND_PUBLIC)
      .filter(f => f.startsWith('exposants-') && f.endsWith('.json'));

    const salons = [];
    for (const file of files) {
      try {
        const filePath = path.join(config.FRONTEND_PUBLIC, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const stat = fs.statSync(filePath);
        salons.push({
          file,
          eventId: data.eventId,
          eventName: data.eventName,
          location: data.location,
          dates: data.dates,
          totalExposants: data.totalExposants,
          matchesFound: data.matchesFound,
          generatedAt: data.generatedAt,
          fileSize: stat.size,
        });
      } catch {}
    }

    res.json({ ok: true, count: salons.length, salons });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/admin/visite/check-new-salons
// Analyse vignerons-independants.com pour détecter des salons non encore scrapés
router.get('/admin/visite/check-new-salons', requireAuth, requireAdmin, async (req, res) => {
  const axios = require('axios');
  const cheerio = require('cheerio');

  try {
    // Récupérer les eventId déjà présents en local
    const files = fs.readdirSync(config.FRONTEND_PUBLIC)
      .filter(f => f.startsWith('exposants-vi-') && f.endsWith('.json'));
    const existingIds = new Set(files.map(f => f.replace('exposants-', '').replace('.json', '')));

    // Scraper la page agenda des vignerons indépendants
    const resp = await axios.get('https://www.vignerons-independants.com/agenda/', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    });

    const $ = cheerio.load(resp.data);
    const newSalons = [];

    // Chercher les liens d'événements (patterns /agenda/salon-xxx/ ou /agenda/.../)
    $('a[href*="/agenda/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const match = href.match(/\/agenda\/([a-z0-9-]+)\/?$/i);
      if (!match) return;

      const slug = match[1].toLowerCase();
      if (slug === 'agenda' || slug === '') return;

      // Construire un eventId probable
      const eventId = `vi-${slug}`;
      if (existingIds.has(eventId)) return;

      // Éviter les doublons dans newSalons
      if (newSalons.some(s => s.slug === slug)) return;

      const text = $(el).text().trim();
      newSalons.push({
        slug,
        eventId,
        contentId: null,
        exposantCount: 0,
        pageUrl: href.startsWith('http') ? href : `https://www.vignerons-independants.com${href}`,
        warning: 'contentId à compléter manuellement',
        title: text || slug,
      });
    });

    res.json({ ok: true, newSalons, checkedAt: new Date().toISOString(), existing: existingIds.size });
  } catch (err) {
    res.status(502).json({ ok: false, error: `Impossible de contacter vignerons-independants.com : ${err.message}` });
  }
});

// POST /api/admin/visite/reload/:eventId
// Re-lit le fichier JSON d'un salon et retourne les stats à jour
router.post('/admin/visite/reload/:eventId', requireAuth, requireAdmin, (req, res) => {
  const { eventId } = req.params;
  if (!/^[a-z0-9\-]{3,60}$/.test(eventId)) {
    return res.status(400).json({ ok: false, error: 'eventId invalide' });
  }

  const filePath = path.join(config.FRONTEND_PUBLIC, `exposants-${eventId}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ ok: false, error: `Salon "${eventId}" non trouvé` });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const stat = fs.statSync(filePath);
    res.json({
      ok: true,
      eventId,
      eventName: data.eventName,
      totalExposants: data.totalExposants,
      matchesFound: data.matchesFound,
      generatedAt: data.generatedAt,
      fileSize: stat.size,
      reloadedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: `Erreur lecture fichier : ${err.message}` });
  }
});

// GET /api/visite/po-details/:eventId
// Retourne les châteaux avec infos restauration/animation/musée scrapées
router.get('/visite/po-details/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const data = await prisma.poDetail.findMany({
      where: { eventId },
      select: {
        chateauName: true,
        chateauUrl: true,
        hasRestauration: true,
        restaurationDesc: true,
        hasAnimation: true,
        animationDesc: true,
        hasMusee: true,
        museeDesc: true,
      }
    });
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[po-details]', err);
    res.status(500).json({ ok: false, error: 'Erreur récupération PO details' });
  }
});

module.exports = router;
