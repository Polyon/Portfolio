import { startTestDb, clearTestDb, stopTestDb } from '../../infrastructure/database/__test__/test-db';
import { AuthService } from '../AuthService';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';

describe('AuthService', () => {
  const authService = new AuthService();
  const userRepo = new UserRepository();

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  describe('hashPassword / comparePassword', () => {
    it('produces a hash different from the plain password', async () => {
      const hash = await authService.hashPassword('mySecret123');
      expect(hash).not.toBe('mySecret123');
      expect(hash.length).toBeGreaterThan(20);
    });

    it('comparePassword returns true for matching password', async () => {
      const hash = await authService.hashPassword('correct');
      expect(await authService.comparePassword('correct', hash)).toBe(true);
    });

    it('comparePassword returns false for wrong password', async () => {
      const hash = await authService.hashPassword('correct');
      expect(await authService.comparePassword('wrong', hash)).toBe(false);
    });
  });

  describe('registerAdmin', () => {
    it('creates an admin user with hashed password', async () => {
      const user = await authService.registerAdmin('admin@test.com', 'Admin@12345');
      expect(user.email).toBe('admin@test.com');
      expect(user.passwordHash).not.toBe('Admin@12345');
      expect(user.role).toBe('ADMIN');
    });

    it('is idempotent — second call returns existing user', async () => {
      await authService.registerAdmin('admin@test.com', 'Admin@12345');
      const second = await authService.registerAdmin('admin@test.com', 'different');
      expect(second.email).toBe('admin@test.com');
      const count = await userRepo.findByEmail('admin@test.com');
      expect(count).not.toBeNull();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.registerAdmin('login@test.com', 'Password1!');
    });

    it('returns tokens and user on valid credentials', async () => {
      const result = await authService.login({ email: 'login@test.com', password: 'Password1!' });
      expect(result.token).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.email).toBe('login@test.com');
      expect(result.user.role).toBe('ADMIN');
    });

    it('throws on wrong password', async () => {
      await expect(authService.login({ email: 'login@test.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('throws on unknown email', async () => {
      await expect(authService.login({ email: 'nope@test.com', password: 'Password1!' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('JWT includes role claim', async () => {
      const result = await authService.login({ email: 'login@test.com', password: 'Password1!' });
      const parts = result.token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString()) as Record<string, unknown>;
      expect(payload['role']).toBe('ADMIN');
    });
  });

  describe('refreshToken', () => {
    it('returns a new access token', async () => {
      await authService.registerAdmin('refresh@test.com', 'Password1!');
      const loginResult = await authService.login({ email: 'refresh@test.com', password: 'Password1!' });
      const refreshResult = await authService.refreshToken(loginResult.refreshToken);
      expect(refreshResult.token).toBeTruthy();
      expect(refreshResult.token.split('.')).toHaveLength(3);
    });

    it('throws on invalid refresh token', async () => {
      await expect(authService.refreshToken('bad.token.here')).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('returns user profile for valid userId', async () => {
      const created = await authService.registerAdmin('current@test.com', 'Password1!');
      const userId = (created._id as object).toString();
      const result = await authService.getCurrentUser(userId);
      expect(result).not.toBeNull();
      expect(result!.email).toBe('current@test.com');
      expect(result!.role).toBe('ADMIN');
      expect(result!.id).toBeTruthy();
    });

    it('returns null for non-existent userId', async () => {
      const result = await authService.getCurrentUser('000000000000000000000001');
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('returns success message', async () => {
      const user = await authService.registerAdmin('logout@test.com', 'Password1!');
      const userId = (user._id as object).toString();
      const result = await authService.logout(userId);
      expect(result.message).toBe('Logged out successfully');
    });

    it('does not throw for non-existent userId', async () => {
      await expect(authService.logout('000000000000000000000001')).resolves.toBeDefined();
    });
  });
});
