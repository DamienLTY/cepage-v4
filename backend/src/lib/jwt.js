const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Génère un JWT 30 jours pour un user
 */
function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    config.JWT_SECRET,
    // SÉCURITÉ (VULN-20) : algorithme explicite pour éviter attaque "alg:none"
    { expiresIn: config.JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

/**
 * Formatte un user pour la réponse API (sans passwordHash)
 */
function formatUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    role: user.role,
    email_verified: user.emailVerified,
    created_at: user.createdAt,
    last_login: user.lastLogin,
  };
}

module.exports = { signToken, formatUser };
