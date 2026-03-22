const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const config = require('../config');

// POST /api/ocr — OCR étiquette via ocr.py Python
// SÉCURITÉ (VULN-11) : requireAuth ajouté — route réservée aux utilisateurs connectés
router.post('/ocr', requireAuth, async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ ok: false, error: 'image base64 requise' });

  // SÉCURITÉ (VULN-12) : limiter la taille de l'image (max ~5 Mo en base64)
  if (typeof image !== 'string' || image.length > 7 * 1024 * 1024) {
    return res.status(400).json({ ok: false, error: 'Image trop volumineuse (max 5 Mo)' });
  }

  const scriptPath = path.join(config.BACKEND_DIR, 'ocr.py');
  const child = spawn(config.PYTHON_BIN, [scriptPath, '--stdin'], {
    cwd: config.BACKEND_DIR,
    timeout: 30000,
  });

  let output = '';
  let errOutput = '';
  child.stdout.on('data', d => { output += d.toString(); });
  child.stderr.on('data', d => { errOutput += d.toString(); });
  child.stdin.write(image);
  child.stdin.end();

  child.on('close', (code) => {
    if (code !== 0) {
      console.error('[ocr]', errOutput);
      return res.status(500).json({ ok: false, error: 'Erreur OCR' });
    }
    try {
      const result = JSON.parse(output);
      res.json(result);
    } catch {
      res.json({ ok: true, text: output, blocks: [] });
    }
  });

  child.on('error', err => {
    console.error('[ocr spawn]', err);
    res.status(500).json({ ok: false, error: 'Erreur OCR' });
  });
});

module.exports = router;
