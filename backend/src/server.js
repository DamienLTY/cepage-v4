const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();

// ---------------------------------------------------------------------------
// SÉCURITÉ : Headers HTTP (VULN-04)
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ---------------------------------------------------------------------------
// SÉCURITÉ : CORS restreint (VULN-03)
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'https://cepage.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // curl, mobile, SSE
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Origine non autorisée par la politique CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', require('./routes/status'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/search'));
app.use('/api', require('./routes/wine'));
app.use('/api', require('./routes/visite'));
app.use('/api/admin/events', require('./routes/events'));
app.use('/api/scrape', require('./routes/scrape'));
app.use('/api', require('./routes/admin'));

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

// ---------------------------------------------------------------------------
// SÉCURITÉ : Error handler générique — ne pas exposer err.message (VULN-17)
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ ok: false, error: 'Erreur interne du serveur.' });
});

// Initialiser l'extension PostgreSQL unaccent (recherche accent-insensitive)
const { prisma } = require('./lib/prisma');
(async () => {
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS unaccent`;
    console.log('PostgreSQL unaccent extension OK');
  } catch (err) {
    console.warn('unaccent extension unavailable:', err.message);
  }
})();

app.listen(config.PORT, () => {
  console.log(`Cépage backend running on port ${config.PORT}`);
});

module.exports = app;
