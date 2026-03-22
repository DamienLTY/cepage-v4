const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const config = require('../config');

// Helper pour spawner un script Python avec arguments
function spawnPython(scriptName, args = [], body = {}) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(config.BACKEND_DIR, scriptName);
    const child = spawn(config.PYTHON_BIN, [scriptPath, ...args], {
      cwd: config.BACKEND_DIR,
      timeout: 600000, // 10 min timeout
    });

    let output = '';
    let errOutput = '';

    child.stdout.on('data', d => { output += d.toString(); });
    child.stderr.on('data', d => { errOutput += d.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[scrape ${scriptName}]`, errOutput);
        return reject(new Error(errOutput || `Script exited with code ${code}`));
      }
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch {
        resolve({ ok: true, output });
      }
    });

    child.on('error', err => {
      console.error(`[scrape spawn ${scriptName}]`, err);
      reject(err);
    });
  });
}

// POST /api/scrape/full — Scraping complet toutes années
router.post('/full', requireAuth, requireAdmin, async (req, res) => {
  const { guideYear = 2026 } = req.body;
  try {
    const result = await spawnPython('scraper.py', ['--full', '--guide-year', String(guideYear)]);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[scrape/full]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erreur scraping complet' });
  }
});

// POST /api/scrape/year — Scraping pour une année donnée
router.post('/year', requireAuth, requireAdmin, async (req, res) => {
  const { year = 2024, guideYear = 2026 } = req.body;
  if (!year || year < 1996) {
    return res.status(400).json({ ok: false, error: 'Année invalide (min 1996)' });
  }
  try {
    const result = await spawnPython('scraper.py', ['--year', String(year), '--guide-year', String(guideYear)]);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[scrape/year]', err);
    res.status(500).json({ ok: false, error: err.message || `Erreur scraping ${year}` });
  }
});

// POST /api/scrape/producers — Scraping des producteurs
router.post('/producers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await spawnPython('scraper.py', ['--producers']);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[scrape/producers]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erreur scraping producteurs' });
  }
});

// POST /api/scrape/backfill-regions — Remplir les régions des producteurs
router.post('/backfill-regions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await spawnPython('scraper.py', ['--backfill-regions']);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[scrape/backfill-regions]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erreur remplissage régions' });
  }
});

// POST /api/scrape/fix-guide-stars — Corriger les étoiles Guide 2026+
router.post('/fix-guide-stars', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await spawnPython('scraper.py', ['--fix-guide-stars']);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[scrape/fix-guide-stars]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erreur correction étoiles' });
  }
});

module.exports = router;
