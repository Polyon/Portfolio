import request from 'supertest';
import type { Application } from 'express';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { AuthService } from '../../../application/AuthService';
import { ProfileService } from '../../../application/ProfileService';
import { createApp } from '../../../app';

describe('Profile Controller (integration)', () => {
  let app: Application;
  let token: string;
  let userId: string;
  const authService = new AuthService();
  const profileService = new ProfileService();

  beforeAll(async () => {
    await startTestDb();
    app = createApp();
    const user = await authService.registerAdmin('profile.test@test.com', 'Password1!');
    userId = (user._id as object).toString();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'profile.test@test.com', password: 'Password1!' });
    token = loginRes.body.data.token as string;
    // Create profile for the user
    await profileService.create(userId);
  });

  afterAll(async () => {
    await clearTestDb();
    await stopTestDb();
  });

  // ─── GET /api/admin/profile ───────────────────────────────────────────────

  describe('GET /api/admin/profile', () => {
    it('returns 200 with profile data', async () => {
      const res = await request(app)
        .get('/api/admin/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/admin/profile');
      expect(res.status).toBe(401);
    });
  });

  // ─── PUT /api/admin/profile ───────────────────────────────────────────────

  describe('PUT /api/admin/profile', () => {
    it('updates profile fields successfully', async () => {
      const res = await request(app)
        .put('/api/admin/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ tagline: 'Senior Engineer', bio: 'Experienced developer' });

      expect(res.status).toBe(200);
      expect(res.body.data.tagline).toBe('Senior Engineer');
    });

    it('returns 400 for invalid profileImageUrl', async () => {
      const res = await request(app)
        .put('/api/admin/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ profileImageUrl: 'not-a-url' });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_INPUT');
    });

    it('returns 400 for tagline exceeding max length', async () => {
      const res = await request(app)
        .put('/api/admin/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ tagline: 'x'.repeat(201) });

      expect(res.status).toBe(400);
    });
  });

  // ─── PUT /api/admin/profile/publish ──────────────────────────────────────

  describe('PUT /api/admin/profile/publish', () => {
    it('publishes the profile', async () => {
      const res = await request(app)
        .put('/api/admin/profile/publish')
        .set('Authorization', `Bearer ${token}`)
        .send({ isPublished: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(true);
    });

    it('unpublishes the profile', async () => {
      const res = await request(app)
        .put('/api/admin/profile/publish')
        .set('Authorization', `Bearer ${token}`)
        .send({ isPublished: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(false);
    });

    it('returns 400 when isPublished is missing', async () => {
      const res = await request(app)
        .put('/api/admin/profile/publish')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_INPUT');
    });
  });
});
