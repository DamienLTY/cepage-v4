const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// SÉCURITÉ (VULN-02) : vérification secret JWT au démarrage
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'dev-secret-change-in-production';
if (JWT_SECRET === 'dev-secret-change-in-production' && process.env.NODE_ENV === 'production') {
  console.error('[SÉCURITÉ CRITIQUE] JWT_SECRET_KEY non configuré en production — arrêt.');
  process.exit(1);
}
if (JWT_SECRET === 'dev-secret-change-in-production') {
  console.warn('[SÉCURITÉ] JWT_SECRET_KEY utilise la valeur par défaut — à configurer avant la mise en production.');
}

const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),

  // JWT — VULN-05 : réduit de 30d à 7d
  JWT_SECRET,
  JWT_EXPIRES_IN: '7d',

  // Database (PostgreSQL uniquement via Prisma)
  DATABASE_URL: process.env.DATABASE_URL,

  // Admin
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_SETUP_KEY: process.env.ADMIN_SETUP_KEY || '',

  // Email
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',

  // Turnstile
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA',

  // App
  APP_URL: process.env.APP_URL || 'http://localhost:5173',

  // Chemins (FRONTEND_PUBLIC et BACKEND_DIR overridables via env pour Docker)
  FRONTEND_PUBLIC: process.env.FRONTEND_PUBLIC || path.join(__dirname, '../../frontend/public'),
  BACKEND_DIR: process.env.BACKEND_DIR || path.join(__dirname, '..'),

  // Python (pour scripts scraping)
  PYTHON_BIN: process.platform === 'win32'
    ? 'C:/Users/damie/AppData/Local/Programs/Python/Python312/python'
    : (process.env.PYTHON_BIN || 'python3'),
};

module.exports = config;
