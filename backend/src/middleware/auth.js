const jwt = require('jsonwebtoken');
const config = require('../config');
const { prisma } = require('../lib/prisma');

/**
 * Extrait et valide le JWT depuis Authorization: Bearer <token>
 * Attache req.user = { id, email, role }
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token manquant' });
  }
  const token = authHeader.slice(7);
  try {
    // SÉCURITÉ (VULN-20) : algorithme explicite pour éviter attaque "alg:none"
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    // Vérification user en BDD
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, emailVerified: true, displayName: true }
    });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Utilisateur introuvable' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Token invalide ou expiré' });
  }
}

/**
 * Vérifie que req.user.role === 'admin'
 * À utiliser après requireAuth
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Accès réservé aux administrateurs' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
