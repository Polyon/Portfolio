import request from 'supertest';
import express from 'express';
import type { Application } from 'express';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { AuthService } from '../../../application/AuthService';
import { createApp } from '../../../app';

describe('Auth Controller (integration)', () => {
  let app: Application;
  const authService = new AuthService();

  beforeAll(async () => {
    await startTestDb();
    app = createApp();
    // Seed a test admin user
    await authService.registerAdmin('authtest@test.com', 'Password1!');
  });

  afterAll(async () => {
    await clearTestDb();
    await stopTestDb();
  });

  // ─── POST /api/auth/login ─────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('returns 200 with tokens on valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'authtest@test.com', password: 'Password1!' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();
      expect(res.body.data.expiresIn).toBeGreaterThan(0);
      expect(res.body.data.user.email).toBe('authtest@test.com');
    });

    it('returns 401 on invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'authtest@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('UNAUTHORIZED');
    });

    it('returns 401 on unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'Password1!' });

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('UNAUTHORIZED');
    });

    it('returns 400 on missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Password1!' });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_INPUT');
    });

    it('returns 400 on invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'Password1!' });

      expect(res.status).toBe(400);
    });
  });

  // ─── POST /api/auth/refresh ───────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'authtest@test.com', password: 'Password1!' });
      refreshToken = (loginRes.body as { data: { refreshToken: string } }).data.refreshToken;
    });

    it('returns 200 with new access token on valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
    });

    it('returns 401 on invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('UNAUTHORIZED');
    });

    it('returns 400 on missing refreshToken', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/auth/me ─────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'authtest@test.com', password: 'Password1!' });
      accessToken = (loginRes.body as { data: { token: string } }).data.token;
    });

    it('returns 200 with user info when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('authtest@test.com');
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('returns 401 without Authorization header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.real.token');

      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/auth/logout ────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'authtest@test.com', password: 'Password1!' });
      accessToken = (loginRes.body as { data: { token: string } }).data.token;
    });

    it('returns 200 with logout message when authenticated', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Logged out successfully');
    });

    it('returns 401 without Authorization header', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
