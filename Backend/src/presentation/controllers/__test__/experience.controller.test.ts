import request from 'supertest';
import type { Application } from 'express';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { AuthService } from '../../../application/AuthService';
import { SkillService } from '../../../application/SkillService';
import { SkillCategory } from '../../../infrastructure/database/models/Skill';
import { createApp } from '../../../app';

describe('Experience Controller (integration)', () => {
  let app: Application;
  let token: string;
  let userId: string;
  const authService = new AuthService();
  const skillService = new SkillService();

  const samplePayload = {
    company: 'Tech Corp',
    jobTitle: 'Senior Engineer',
    employmentType: 'FULL_TIME',
    startDate: '2022-01-01',
  };

  beforeAll(async () => {
    await startTestDb();
    app = createApp();
    const user = await authService.registerAdmin('exp.test@test.com', 'Password1!');
    userId = (user._id as object).toString();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'exp.test@test.com', password: 'Password1!' });
    token = loginRes.body.data.token as string;
  });

  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  // ─── POST /api/admin/experiences ─────────────────────────────────────────

  describe('POST /api/admin/experiences', () => {
    it('creates an experience and returns 201', async () => {
      const res = await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      expect(res.status).toBe(201);
      expect(res.body.data.company).toBe('Tech Corp');
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'TestCo' });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_INPUT');
    });

    it('returns 400 for invalid employmentType', async () => {
      const res = await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...samplePayload, employmentType: 'ALIEN' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/admin/experiences')
        .send(samplePayload);

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/admin/experiences ──────────────────────────────────────────

  describe('GET /api/admin/experiences', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);
    });

    it('returns experiences list with pagination', async () => {
      const res = await request(app)
        .get('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
    });
  });

  // ─── GET /api/admin/experiences/:id ──────────────────────────────────────

  describe('GET /api/admin/experiences/:id', () => {
    it('returns a single experience with skillIds', async () => {
      const createRes = await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      const expId = createRes.body.data.id as string;

      const res = await request(app)
        .get(`/api/admin/experiences/${expId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skillIds).toBeDefined();
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app)
        .get('/api/admin/experiences/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PUT /api/admin/experiences/:id ──────────────────────────────────────

  describe('PUT /api/admin/experiences/:id', () => {
    it('updates an experience', async () => {
      const createRes = await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      const expId = createRes.body.data.id as string;

      const res = await request(app)
        .put(`/api/admin/experiences/${expId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Updated Corp' });

      expect(res.status).toBe(200);
      expect(res.body.data.company).toBe('Updated Corp');
    });
  });

  // ─── DELETE /api/admin/experiences/:id ───────────────────────────────────

  describe('DELETE /api/admin/experiences/:id', () => {
    it('soft-deletes and returns 204', async () => {
      const createRes = await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      const expId = createRes.body.data.id as string;

      const res = await request(app)
        .delete(`/api/admin/experiences/${expId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 for non-existent experience', async () => {
      const res = await request(app)
        .delete('/api/admin/experiences/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/admin/experiences/:id/skills ───────────────────────────────

  describe('POST /api/admin/experiences/:id/skills', () => {
    it('sets skills on an experience', async () => {
      const user2 = await authService.registerAdmin('exp2.test@test.com', 'Password1!');
      const uid = (user2._id as object).toString();
      const skill = await skillService.create(uid, { name: 'Node', category: SkillCategory.BACKEND, proficiencyLevel: 5 });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'exp2.test@test.com', password: 'Password1!' });
      const tok = loginRes.body.data.token as string;

      const createRes = await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${tok}`)
        .send({ ...samplePayload });

      const expId = createRes.body.data.id as string;

      const res = await request(app)
        .post(`/api/admin/experiences/${expId}/skills`)
        .set('Authorization', `Bearer ${tok}`)
        .send({ skillIds: [skill._id.toString()] });

      expect(res.status).toBe(200);
    });

    it('returns 400 for missing skillIds', async () => {
      const createRes = await request(app)
        .post('/api/admin/experiences')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      const expId = createRes.body.data.id as string;

      const res = await request(app)
        .post(`/api/admin/experiences/${expId}/skills`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
