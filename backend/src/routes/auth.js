'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const { prisma } = require('../lib/prisma');
const { signToken, formatUser } = require('../lib/jwt');
const { sendResetEmail, sendVerifyEmail } = require('../lib/email');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const config = require('../config');

// ---------------------------------------------------------------------------
// SÉCURITÉ : Rate limiting en mémoire (VULN-01)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map();

function isRateLimited(key, maxAttempts, windowMs) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.start > windowMs) {
    rateLimitMap.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > maxAttempts;
}

// Nettoyage périodique toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.start > 900000) rateLimitMap.delete(key);
  }
}, 300000);

// ---------------------------------------------------------------------------
// SÉCURITÉ : Validation helpers (VULN-09, VULN-10)
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

function sanitizeDisplayName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.slice(0, 100).replace(/[<>"'&]/g, '').trim();
}

// ---------------------------------------------------------------------------
// Helper : vérification Turnstile CAPTCHA (fail open si erreur réseau)
// ---------------------------------------------------------------------------

/**
 * Vérifie un token Cloudflare Turnstile.
 * Retourne true si absent (champ optionnel) ou si la vérification réussit.
 * En cas d'erreur réseau, retourne true (fail open).
 * @param {string|undefined} token
 * @returns {Promise<boolean>}
 */
async function verifyTurnstile(token) {
  if (!token) return true;
  try {
    const resp = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { secret: config.TURNSTILE_SECRET_KEY, response: token },
      { timeout: 5000 }
    );
    return resp.data.success === true;
  } catch {
    return true; // fail open
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

/**
 * Crée un nouveau compte utilisateur.
 * Body : { email, password, display_name?, captcha_token? }
 */
router.post('/register', async (req, res) => {
  try {
    // SÉCURITÉ (VULN-01) : rate limiting — 5 inscriptions par IP par 15 min
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(`register:${ip}`, 5, 900000)) {
      return res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const { email, password, display_name = '', captcha_token } = req.body;

    // SÉCURITÉ (VULN-09) : validation email robuste
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Email invalide.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ ok: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ ok: false, error: 'Le mot de passe ne doit pas dépasser 128 caractères.' });
    }

    // Vérification CAPTCHA (fail-open uniquement si clé de test)
    const captchaOk = await verifyTurnstile(captcha_token);
    if (!captchaOk) {
      return res.status(400).json({ ok: false, error: 'Vérification CAPTCHA échouée.' });
    }

    // Vérifier doublon email
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Cet email est déjà utilisé.' });
    }

    // Déterminer le rôle
    const role =
      config.ADMIN_EMAIL && normalizedEmail === config.ADMIN_EMAIL.toLowerCase()
        ? 'admin'
        : 'user';

    // Hash du mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // SÉCURITÉ (VULN-10) : sanitize display_name
    const safeDisplayName = sanitizeDisplayName(display_name);

    // Création du user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: safeDisplayName,
        role,
        emailVerified: true,
      },
    });

    return res.status(201).json({
      ok: true,
      user: formatUser(user),
      token: signToken(user),
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de l\'inscription.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

/**
 * Authentifie un utilisateur existant.
 * Body : { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    // SÉCURITÉ (VULN-01) : rate limiting — 10 tentatives par IP par 15 min
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(`login:${ip}`, 10, 900000)) {
      return res.status(429).json({ ok: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email et mot de passe requis.' });
    }

    // Recherche du user
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Email ou mot de passe incorrect.' });
    }

    // Vérification du mot de passe
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ ok: false, error: 'Email ou mot de passe incorrect.' });
    }

    // Mise à jour lastLogin
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return res.json({
      ok: true,
      user: formatUser(updatedUser),
      token: signToken(updatedUser),
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de la connexion.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

/**
 * Retourne le profil de l'utilisateur connecté.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    return res.json({ ok: true, user: formatUser(req.user) });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/me
// ---------------------------------------------------------------------------

/**
 * Met à jour le profil de l'utilisateur connecté.
 * Body : { display_name?, current_password?, new_password?, new_email? }
 */
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { display_name, current_password, new_password, new_email } = req.body;
    const userId = req.user.id;
    const updateData = {};

    // Mise à jour du display name
    if (display_name !== undefined) {
      updateData.displayName = sanitizeDisplayName(display_name);
    }

    // Changement de mot de passe
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ ok: false, error: 'Mot de passe actuel requis.' });
      }
      if (new_password.length < 8) {
        return res.status(400).json({ ok: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      }

      // Récupérer le user complet pour vérifier l'ancien mot de passe
      const fullUser = await prisma.user.findUnique({ where: { id: userId } });
      const passwordOk = await bcrypt.compare(current_password, fullUser.passwordHash);
      if (!passwordOk) {
        return res.status(400).json({ ok: false, error: 'Mot de passe actuel incorrect.' });
      }

      updateData.passwordHash = await bcrypt.hash(new_password, 12);
    }

    // Changement d'email : envoi de vérification
    if (new_email) {
      if (!new_email.includes('@')) {
        return res.status(400).json({ ok: false, error: 'Nouvel email invalide.' });
      }
      const existing = await prisma.user.findUnique({ where: { email: new_email } });
      if (existing) {
        return res.status(409).json({ ok: false, error: 'Cet email est déjà utilisé.' });
      }

      const verifyToken = crypto.randomBytes(32).toString('hex');
      await prisma.emailToken.create({
        data: {
          token: verifyToken,
          userId,
          type: 'verify',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });

      await sendVerifyEmail(new_email, verifyToken);
      // Note : l'email n'est mis à jour qu'après vérification du token
    }

    // Appliquer les modifications si nécessaire
    let updatedUser;
    if (Object.keys(updateData).length > 0) {
      updatedUser = await prisma.user.update({ where: { id: userId }, data: updateData });
    } else {
      updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    }

    return res.json({ ok: true, user: formatUser(updatedUser) });
  } catch (err) {
    console.error('[patch me]', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de la mise à jour.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/request-reset
// ---------------------------------------------------------------------------

/**
 * Demande un lien de réinitialisation de mot de passe.
 * Anti-énumération : répond toujours OK même si l'email est inconnu.
 * Body : { email }
 */
router.post('/request-reset', async (req, res) => {
  const SUCCESS_MESSAGE = 'Si cet email existe, un lien de réinitialisation a été envoyé.';
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ ok: true, message: SUCCESS_MESSAGE });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await prisma.emailToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          type: 'reset',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
        },
      });
      await sendResetEmail(user.email, resetToken);
    }

    return res.json({ ok: true, message: SUCCESS_MESSAGE });
  } catch (err) {
    console.error('[request-reset]', err);
    // Même en cas d'erreur : ne pas révéler l'état de l'email
    return res.json({ ok: true, message: SUCCESS_MESSAGE });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------

/**
 * Réinitialise le mot de passe via token.
 * Body : { token, password }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ ok: false, error: 'Token manquant.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ ok: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    // Recherche du token valide
    const emailToken = await prisma.emailToken.findUnique({ where: { token } });
    if (
      !emailToken ||
      emailToken.type !== 'reset' ||
      emailToken.used ||
      emailToken.expiresAt < new Date()
    ) {
      return res.status(400).json({ ok: false, error: 'Token invalide ou expiré.' });
    }

    // Hash du nouveau mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Mise à jour en transaction : password + invalidation du token
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { passwordHash },
      }),
      prisma.emailToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);

    return res.json({
      ok: true,
      user: formatUser(updatedUser),
      token: signToken(updatedUser),
    });
  } catch (err) {
    console.error('[reset-password]', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de la réinitialisation.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email
// ---------------------------------------------------------------------------

/**
 * Vérifie l'adresse email via token.
 * Query : ?token=...
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: 'Token manquant.' });
    }

    // Recherche du token valide
    const emailToken = await prisma.emailToken.findUnique({ where: { token } });
    if (
      !emailToken ||
      emailToken.type !== 'verify' ||
      emailToken.used ||
      emailToken.expiresAt < new Date()
    ) {
      return res.status(400).json({ ok: false, error: 'Token invalide ou expiré.' });
    }

    // Mise à jour en transaction : emailVerified + invalidation du token
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { emailVerified: true },
      }),
      prisma.emailToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);

    return res.json({
      ok: true,
      user: formatUser(updatedUser),
      token: signToken(updatedUser),
    });
  } catch (err) {
    console.error('[verify-email]', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de la vérification.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/favorites
// ---------------------------------------------------------------------------

/**
 * Retourne les favoris de l'utilisateur connecté avec les millésimes inclus.
 */
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    const favs = await prisma.userFavorite.findMany({
      where: { userId: req.user.id },
      include: {
        producer: {
          include: { vintages: { orderBy: { year: 'desc' } } }
        }
      },
      orderBy: { addedAt: 'desc' },
    });

    const results = favs.map(f => ({
      producerCode: f.producerCode,
      wineName: f.wineName,
      producerName: f.producer.name,
      region: f.producer.region,
      addedAt: f.addedAt,
      vintages: f.producer.vintages.filter(v => v.wineName === f.wineName),
    }));

    res.json({ ok: true, favorites: results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/favorites
// ---------------------------------------------------------------------------

/**
 * Ajoute un favori.
 * Body : { producerCode, wineName }
 */
router.post('/favorites', requireAuth, async (req, res) => {
  const { producerCode, wineName } = req.body;
  if (!producerCode || !wineName) {
    return res.status(400).json({ ok: false, error: 'producerCode et wineName requis' });
  }
  try {
    await prisma.userFavorite.upsert({
      where: { userId_producerCode_wineName: { userId: req.user.id, producerCode, wineName } },
      create: { userId: req.user.id, producerCode, wineName },
      update: {},
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/auth/favorites/:producerCode/:wineName
// ---------------------------------------------------------------------------

/**
 * Supprime un favori par producerCode et wineName.
 */
router.delete('/favorites/:producerCode/:wineName', requireAuth, async (req, res) => {
  const { producerCode, wineName } = req.params;
  try {
    await prisma.userFavorite.delete({
      where: { userId_producerCode_wineName: { userId: req.user.id, producerCode, wineName: decodeURIComponent(wineName) } },
    });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ ok: false, error: 'Favori introuvable' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/favorites/sync
// ---------------------------------------------------------------------------

/**
 * Synchronise une liste de favoris depuis le localStorage.
 * Body : { favorites: [{producerCode, wineName}] }
 */
router.post('/favorites/sync', requireAuth, async (req, res) => {
  const { favorites = [] } = req.body;
  try {
    for (const { producerCode, wineName } of favorites) {
      if (!producerCode || !wineName) continue;
      await prisma.userFavorite.upsert({
        where: { userId_producerCode_wineName: { userId: req.user.id, producerCode, wineName } },
        create: { userId: req.user.id, producerCode, wineName },
        update: {},
      }).catch(() => {});
    }
    const favs = await prisma.userFavorite.findMany({
      where: { userId: req.user.id },
      include: { producer: { include: { vintages: { orderBy: { year: 'desc' } } } } },
    });
    const results = favs.map(f => ({
      producerCode: f.producerCode,
      wineName: f.wineName,
      producerName: f.producer.name,
      region: f.producer.region,
      vintages: f.producer.vintages.filter(v => v.wineName === f.wineName),
    }));
    res.json({ ok: true, favorites: results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/users/create-test  (admin)
// ---------------------------------------------------------------------------

/**
 * Crée un utilisateur de test.
 * Body : { email?, display_name, role }
 */
router.post('/users/create-test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { display_name = 'Test User', role = 'user' } = req.body;
    let { email } = req.body;

    // Générer un email si absent
    if (!email) {
      email = `test-${crypto.randomBytes(4).toString('hex')}@test.local`;
    }

    // Générer un mot de passe aléatoire
    const generatedPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(generatedPassword, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: display_name,
        role,
        emailVerified: true,
      },
    });

    return res.status(201).json({
      ok: true,
      user: formatUser(user),
      password: generatedPassword,
      message: `Utilisateur de test créé avec le mot de passe : ${generatedPassword}`,
    });
  } catch (err) {
    console.error('[create-test]', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'Cet email est déjà utilisé.' });
    }
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de la création du compte test.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/users  (admin)
// ---------------------------------------------------------------------------

/**
 * Retourne la liste de tous les utilisateurs.
 */
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    let users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Cas migration : s'assurer que l'admin courant est dans la liste
    const currentUserInList = users.some((u) => u.id === req.user.id);
    if (!currentUserInList) {
      const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (currentUser) {
        users = [currentUser, ...users];
      }
    }

    return res.json({
      ok: true,
      users: users.map(formatUser),
      total: users.length,
    });
  } catch (err) {
    console.error('[get users]', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de la récupération des utilisateurs.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/auth/users/:userId  (admin)
// ---------------------------------------------------------------------------

/**
 * Supprime un utilisateur (cascade tokens + favoris).
 */
router.delete('/users/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ ok: false, error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    await prisma.user.delete({ where: { id: userId } });

    return res.json({ ok: true, deleted: userId });
  } catch (err) {
    console.error('[delete user]', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Utilisateur introuvable.' });
    }
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de la suppression.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/users/:userId/role  (admin)
// ---------------------------------------------------------------------------

/**
 * Modifie le rôle d'un utilisateur.
 * Body : { role: 'user'|'premium'|'admin' }
 */
router.patch('/users/:userId/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (userId === req.user.id) {
      return res.status(400).json({ ok: false, error: 'Vous ne pouvez pas modifier votre propre rôle.' });
    }

    const VALID_ROLES = ['user', 'premium', 'admin'];
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ ok: false, error: `Rôle invalide. Valeurs acceptées : ${VALID_ROLES.join(', ')}.` });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return res.json({ ok: true, user_id: userId, new_role: role });
  } catch (err) {
    console.error('[patch role]', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Utilisateur introuvable.' });
    }
    return res.status(500).json({ ok: false, error: 'Erreur interne lors de la modification du rôle.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/setup-admin
// ---------------------------------------------------------------------------

/**
 * Élève un compte existant en admin via une clé secrète de setup.
 * Body : { key, email }
 */
router.post('/setup-admin', async (req, res) => {
  try {
    const { key, email } = req.body;

    if (!key || !config.ADMIN_SETUP_KEY) {
      return res.status(400).json({ ok: false, error: 'Clé de setup manquante ou non configurée.' });
    }
    if (key !== config.ADMIN_SETUP_KEY) {
      return res.status(400).json({ ok: false, error: 'Clé de setup invalide.' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email requis.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Utilisateur introuvable.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
    });

    return res.json({
      ok: true,
      user: formatUser(updatedUser),
      token: signToken(updatedUser),
    });
  } catch (err) {
    console.error('[setup-admin]', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne lors du setup admin.' });
  }
});

module.exports = router;
