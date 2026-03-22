const jwt = require('jsonwebtoken');
const { requireAuth, requireAdmin } = require('../../src/middleware/auth');

// Mock Prisma
jest.mock('../../src/lib/prisma', () => require('../helpers/mockPrisma'));
const { prismaMock } = require('../helpers/mockPrisma');

// Mock config
jest.mock('../../src/config', () => ({
  JWT_SECRET: 'test-secret-key',
  JWT_EXPIRES_IN: '30d',
}));

const config = require('../../src/config');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('requireAuth', () => {
    it('should return 401 when Authorization header is missing', async () => {
      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Token manquant',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Basic xyz123';
      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Token manquant',
      });
    });

    it('should return 401 when token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid.token.here';
      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Token invalide ou expiré',
      });
    });

    it('should return 401 when user is not found in DB', async () => {
      const validToken = jwt.sign(
        { sub: 'user-999', email: 'missing@example.com', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '30d' }
      );
      req.headers.authorization = `Bearer ${validToken}`;
      prismaMock.user.findUnique.mockResolvedValue(null);

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Utilisateur introuvable',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should attach user to req and call next when token is valid', async () => {
      const validToken = jwt.sign(
        { sub: 'user-123', email: 'test@example.com', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '30d' }
      );
      req.headers.authorization = `Bearer ${validToken}`;

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        emailVerified: true,
        displayName: 'Test User',
      };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await requireAuth(req, res, next);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          displayName: true,
        },
      });
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle expired tokens', async () => {
      const expiredToken = jwt.sign(
        { sub: 'user-123', email: 'test@example.com', role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '-1h' } // Déjà expiré
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Token invalide ou expiré',
      });
    });
  });

  describe('requireAdmin', () => {
    it('should return 403 when req.user is not set', () => {
      req.user = null;
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Accès réservé aux administrateurs',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not admin', () => {
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Accès réservé aux administrateurs',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next when user role is admin', () => {
      req.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };
      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 for other roles', () => {
      req.user = {
        id: 'user-456',
        email: 'moderator@example.com',
        role: 'moderator',
      };
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
