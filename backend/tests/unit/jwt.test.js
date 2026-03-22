const jwt = require('jsonwebtoken');
const { signToken, formatUser } = require('../../src/lib/jwt');
const config = require('../../src/config');

describe('JWT utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signToken', () => {
    it('should create a valid JWT with correct payload', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = signToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, config.JWT_SECRET);
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('admin');
    });

    it('should expire in 30 days', () => {
      const user = {
        id: 'user-456',
        email: 'admin@example.com',
        role: 'admin',
      };

      const token = signToken(user);
      const decoded = jwt.verify(token, config.JWT_SECRET);

      expect(decoded.exp).toBeDefined();
      // Vérifier que le token expire dans ~30 jours (dans ~2592000 secondes)
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      expect(expiresIn).toBeGreaterThan(2500000);
      expect(expiresIn).toBeLessThan(2700000);
    });

    it('should not be verifiable with wrong secret', () => {
      const user = {
        id: 'user-789',
        email: 'user@example.com',
        role: 'user',
      };

      const token = signToken(user);

      expect(() => {
        jwt.verify(token, 'wrong-secret');
      }).toThrow();
    });
  });

  describe('formatUser', () => {
    it('should format user without passwordHash', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'John Doe',
        role: 'user',
        emailVerified: true,
        createdAt: new Date('2025-01-01'),
        lastLogin: new Date('2025-03-21'),
        passwordHash: 'should-not-appear', // Ne doit pas être inclus
      };

      const formatted = formatUser(user);

      expect(formatted).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'John Doe',
        role: 'user',
        email_verified: true,
        created_at: new Date('2025-01-01'),
        last_login: new Date('2025-03-21'),
      });
      expect(formatted.passwordHash).toBeUndefined();
    });

    it('should map all user fields correctly', () => {
      const user = {
        id: 'admin-456',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'admin',
        emailVerified: false,
        createdAt: new Date('2025-02-15'),
        lastLogin: null,
        passwordHash: 'hash123',
      };

      const formatted = formatUser(user);

      expect(formatted.id).toBe('admin-456');
      expect(formatted.email).toBe('admin@example.com');
      expect(formatted.display_name).toBe('Admin User');
      expect(formatted.role).toBe('admin');
      expect(formatted.email_verified).toBe(false);
      expect(formatted.last_login).toBeNull();
    });
  });
});
