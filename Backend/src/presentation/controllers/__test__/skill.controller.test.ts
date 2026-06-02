import request from 'supertest';
import type { Application } from 'express';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { AuthService } from '../../../application/AuthService';
import { createApp } from '../../../app';

describe('Skills Controller (integration)', () => {
  let app: Application;
  let token: string;
  const authService = new AuthService();

  beforeAll(async () => {
    await startTestDb();
    app = createApp();
    await authService.registerAdmin('skills.test@test.com', 'Password1!');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'skills.test@test.com', password: 'Password1!' });
    token = loginRes.body.data.token as string;
  });

  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  // ─── POST /api/admin/skills ───────────────────────────────────────────────

  describe('POST /api/admin/skills', () => {
    it('creates a skill and returns 201', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'TypeScript', category: 'BACKEND', proficiencyLevel: 5 });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('TypeScript');
      expect(res.body.data.category).toBe('BACKEND');
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'TypeScript' });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_INPUT');
    });

    it('returns 400 for invalid proficiencyLevel (> 5)', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'TypeScript', category: 'BACKEND', proficiencyLevel: 10 });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid category', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'TypeScript', category: 'INVALID', proficiencyLevel: 3 });

      expect(res.status).toBe(400);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/admin/skills')
        .send({ name: 'TypeScript', category: 'BACKEND', proficiencyLevel: 5 });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/admin/skills ────────────────────────────────────────────────

  describe('GET /api/admin/skills', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Node.js', category: 'BACKEND', proficiencyLevel: 4 });
      await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Angular', category: 'FRONTEND', proficiencyLevel: 4 });
    });

    it('returns all skills with pagination', async () => {
      const res = await request(app)
        .get('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('filters skills by category', async () => {
      const res = await request(app)
        .get('/api/admin/skills?category=BACKEND')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Node.js');
    });

    it('searches skills by name', async () => {
      const res = await request(app)
        .get('/api/admin/skills?search=ang')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Angular');
    });
  });

  // ─── GET /api/admin/skills/:id ────────────────────────────────────────────

  describe('GET /api/admin/skills/:id', () => {
    it('returns 200 with skill data', async () => {
      const createRes = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Docker', category: 'DEVOPS', proficiencyLevel: 3 });

      const skillId = createRes.body.data._id as string;

      const res = await request(app)
        .get(`/api/admin/skills/${skillId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Docker');
    });

    it('returns 404 for non-existent skill', async () => {
      const res = await request(app)
        .get('/api/admin/skills/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PUT /api/admin/skills/:id ────────────────────────────────────────────

  describe('PUT /api/admin/skills/:id', () => {
    it('updates the skill', async () => {
      const createRes = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'CSS', category: 'FRONTEND', proficiencyLevel: 3 });

      const skillId = createRes.body.data._id as string;

      const res = await request(app)
        .put(`/api/admin/skills/${skillId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ proficiencyLevel: 4 });

      expect(res.status).toBe(200);
      expect(res.body.data.proficiencyLevel).toBe(4);
    });

    it('returns 404 for non-existent skill', async () => {
      const res = await request(app)
        .put('/api/admin/skills/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ proficiencyLevel: 4 });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /api/admin/skills/:id ─────────────────────────────────────────

  describe('DELETE /api/admin/skills/:id', () => {
    it('soft-deletes the skill and returns 204', async () => {
      const createRes = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Redis', category: 'DATABASE', proficiencyLevel: 3 });

      const skillId = createRes.body.data._id as string;

      const res = await request(app)
        .delete(`/api/admin/skills/${skillId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify it's gone from list
      const listRes = await request(app)
        .get('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.body.data.find((s: { _id: string }) => s._id === skillId)).toBeUndefined();
    });

    it('returns 404 for non-existent skill', async () => {
      const res = await request(app)
        .delete('/api/admin/skills/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Response Time (<200ms p95) ───────────────────────────────────────────

  describe('Response Time', () => {
    const BUDGET_MS = 200;

    beforeEach(async () => {
      await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'PerfSkill', category: 'BACKEND', proficiencyLevel: 3 });
    });

    it('GET /api/admin/skills responds within 200ms', async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`);
      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(BUDGET_MS);
    });

    it('POST /api/admin/skills responds within 200ms', async () => {
      const start = Date.now();
      const res = await request(app)
        .post('/api/admin/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'AnotherSkill', category: 'FRONTEND', proficiencyLevel: 4 });
      const elapsed = Date.now() - start;

      expect(res.status).toBe(201);
      expect(elapsed).toBeLessThan(BUDGET_MS);
    });
  });
});
