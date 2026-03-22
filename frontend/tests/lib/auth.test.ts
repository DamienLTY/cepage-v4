import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredToken,
  getStoredUser,
  storeAuth,
  clearAuth,
  authHeaders,
  type AuthUser,
} from '../../src/lib/auth';

describe('auth.ts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getStoredToken', () => {
    it('should return null when no token is stored', () => {
      expect(getStoredToken()).toBeNull();
    });

    it('should return the stored token', () => {
      localStorage.setItem('cepage_jwt', 'test-token-123');
      expect(getStoredToken()).toBe('test-token-123');
    });

    it('should return null when localStorage is corrupted', () => {
      localStorage.clear();
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('getStoredUser', () => {
    it('should return null when no user is stored', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('should return the stored user as an object', () => {
      const user: AuthUser = {
        id: 'user-123',
        email: 'john@example.com',
        display_name: 'John Doe',
        role: 'user',
        email_verified: true,
        created_at: '2026-03-21T00:00:00Z',
      };
      localStorage.setItem('cepage_user', JSON.stringify(user));
      const stored = getStoredUser();
      expect(stored).toEqual(user);
    });

    it('should return null when user JSON is corrupted', () => {
      localStorage.setItem('cepage_user', 'invalid-json{');
      expect(getStoredUser()).toBeNull();
    });

    it('should return null when user is "null" string', () => {
      localStorage.setItem('cepage_user', 'null');
      expect(getStoredUser()).toBeNull();
    });

    it('should handle admin role', () => {
      const adminUser: AuthUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        display_name: 'Admin User',
        role: 'admin',
        email_verified: true,
        created_at: '2026-03-21T00:00:00Z',
      };
      localStorage.setItem('cepage_user', JSON.stringify(adminUser));
      const stored = getStoredUser();
      expect(stored?.role).toBe('admin');
    });
  });

  describe('storeAuth', () => {
    it('should store token and user in localStorage', () => {
      const user: AuthUser = {
        id: 'user-456',
        email: 'jane@example.com',
        display_name: 'Jane Doe',
        role: 'user',
        email_verified: false,
        created_at: '2026-03-21T00:00:00Z',
      };
      const token = 'jwt-token-xyz';

      storeAuth(token, user);

      expect(localStorage.getItem('cepage_jwt')).toBe(token);
      expect(JSON.parse(localStorage.getItem('cepage_user') || '{}')).toEqual(user);
    });

    it('should overwrite existing token and user', () => {
      const user1: AuthUser = {
        id: 'user-1',
        email: 'user1@example.com',
        display_name: 'User 1',
        role: 'user',
        email_verified: true,
        created_at: '2026-03-21T00:00:00Z',
      };
      const user2: AuthUser = {
        id: 'user-2',
        email: 'user2@example.com',
        display_name: 'User 2',
        role: 'admin',
        email_verified: true,
        created_at: '2026-03-21T00:00:00Z',
      };

      storeAuth('token-1', user1);
      expect(getStoredUser()?.id).toBe('user-1');

      storeAuth('token-2', user2);
      expect(getStoredToken()).toBe('token-2');
      expect(getStoredUser()?.id).toBe('user-2');
    });
  });

  describe('clearAuth', () => {
    it('should remove token and user from localStorage', () => {
      const user: AuthUser = {
        id: 'user-789',
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'user',
        email_verified: true,
        created_at: '2026-03-21T00:00:00Z',
      };
      storeAuth('test-token', user);
      expect(getStoredToken()).not.toBeNull();
      expect(getStoredUser()).not.toBeNull();

      clearAuth();

      expect(getStoredToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });

    it('should not throw error when clearing empty auth', () => {
      expect(() => {
        clearAuth();
      }).not.toThrow();
    });
  });

  describe('authHeaders', () => {
    it('should return Content-Type without token', () => {
      const headers = authHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should return Authorization header with Bearer token', () => {
      localStorage.setItem('cepage_jwt', 'abc-def-ghi');
      const headers = authHeaders();
      expect(headers['Authorization']).toBe('Bearer abc-def-ghi');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should update headers when token changes', () => {
      localStorage.setItem('cepage_jwt', 'token-1');
      let headers = authHeaders();
      expect(headers['Authorization']).toBe('Bearer token-1');

      localStorage.setItem('cepage_jwt', 'token-2');
      headers = authHeaders();
      expect(headers['Authorization']).toBe('Bearer token-2');
    });

    it('should always include Content-Type', () => {
      let headers = authHeaders();
      expect(headers['Content-Type']).toBe('application/json');

      localStorage.setItem('cepage_jwt', 'some-token');
      headers = authHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
