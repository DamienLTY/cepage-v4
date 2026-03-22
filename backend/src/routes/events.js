const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const config = require('../config');
const { spawn } = require('child_process');

const EVENTS_FILE = path.join(config.FRONTEND_PUBLIC, 'events_dynamic.json');
const SOURCES_FILE = path.join(config.BACKEND_DIR, 'event_sources.json');

function loadEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8')); } catch { return []; }
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

function loadSources() {
  if (!fs.existsSync(SOURCES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8')); } catch { return []; }
}

// Scraping générique avec cheerio
async function scrapeGeneric(url) {
  const resp = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });
  const $ = cheerio.load(resp.data);

  const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || '';
  const description = $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content')
    || $('p').first().text().trim() || '';
  const image = $('meta[property="og:image"]').attr('content') || '';

  // Extraire dates (regex français)
  const fullText = $('body').text();
  const dateMatches = fullText.match(/\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\b/gi) || [];

  // Extraire liens internes
  const internalLinks = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('http') || (href && href.includes(new URL(url).hostname))) {
      internalLinks.push(href);
    }
  });

  return { url, title, description, image, dates: dateMatches, internalLinks: internalLinks.slice(0, 20), scrapedAt: new Date().toISOString() };
}

// GET /api/admin/events/sources
router.get('/sources', requireAuth, requireAdmin, (req, res) => {
  const sources = loadSources();
  res.json({ ok: true, count: sources.length, sources });
});

// POST /api/admin/events/preview
router.post('/preview', requireAuth, requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ ok: false, error: 'URL requise' });

  try {
    const preview = await scrapeGeneric(url);
    const suggestedEvent = {
      title: preview.title,
      description: preview.description,
      image: preview.image,
      dates: preview.dates[0] || '',
      location: '',
      category: 'salon',
    };
    res.json({ ok: true, preview, suggestedEvent });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

// GET /api/admin/events/dynamic
router.get('/dynamic', requireAuth, requireAdmin, (req, res) => {
  const events = loadEvents();
  res.json({ ok: true, count: events.length, events });
});

// POST /api/admin/events/save
router.post('/save', requireAuth, requireAdmin, (req, res) => {
  const { event } = req.body;
  if (!event || !event.id) return res.status(400).json({ ok: false, error: 'event.id requis' });

  const events = loadEvents();
  const idx = events.findIndex(e => e.id === event.id);
  let action;
  if (idx >= 0) { events[idx] = { ...events[idx], ...event }; action = 'updated'; }
  else { events.push(event); action = 'created'; }

  saveEvents(events);
  res.json({ ok: true, action, eventId: event.id, total: events.length });
});

// DELETE /api/admin/events/delete/:eventId
router.delete('/delete/:eventId', requireAuth, requireAdmin, (req, res) => {
  let events = loadEvents();
  const before = events.length;
  events = events.filter(e => e.id !== req.params.eventId);
  saveEvents(events);
  res.json({ ok: true, deleted: before - events.length, remaining: events.length });
});

// POST /api/admin/events/scrape-medoc
router.post('/scrape-medoc', requireAuth, requireAdmin, (req, res) => {
  const { eventId = 'po-medoc-2026', eventName, location, dates } = req.body;
  const scriptPath = path.join(config.BACKEND_DIR, 'scrape_medoc.py');
  const outputFile = path.join(config.FRONTEND_PUBLIC, `exposants-${eventId}.json`);

  const args = [scriptPath, '--output', outputFile, '--event-id', eventId];
  if (eventName) args.push('--event-name', eventName);

  const child = spawn(config.PYTHON_BIN, args, { cwd: config.BACKEND_DIR, timeout: 600000 });

  let errOutput = '';
  child.stderr.on('data', d => { errOutput += d.toString(); });

  child.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ ok: false, error: errOutput || 'Scraping medoc failed' });
    }
    try {
      const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      res.json({ ok: true, eventId, stats: { totalExposants: data.totalExposants }, generatedAt: data.generatedAt });
    } catch {
      res.json({ ok: true, eventId, message: 'Done' });
    }
  });

  child.on('error', err => res.status(500).json({ ok: false, error: err.message }));
});

// GET /api/admin/events/check-sources
router.get('/check-sources', requireAuth, requireAdmin, async (req, res) => {
  const sources = loadSources();
  const results = [];

  for (const source of sources) {
    if (!source.active) { results.push({ id: source.id, status: 'disabled' }); continue; }
    try {
      const resp = await axios.get(source.url, { timeout: 10000 });
      const $ = cheerio.load(resp.data);
      const estimatedLinks = $('a[href]').length;
      results.push({ id: source.id, status: 'ok', estimatedLinks });
    } catch (err) {
      results.push({ id: source.id, status: 'error', error: err.message });
    }
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const errors = results.filter(r => r.status === 'error').length;
  res.json({ ok: true, checkedAt: new Date().toISOString(), sources: results, summary: { total: sources.length, ok, errors } });
});

module.exports = router;
