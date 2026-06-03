import request from 'supertest';
import type { Application } from 'express';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { AuthService } from '../../../application/AuthService';
import { createApp } from '../../../app';

describe('Project Controller (integration)', () => {
  let app: Application;
  let token: string;
  const authService = new AuthService();

  const samplePayload = {
    name: 'Portfolio Site',
    description: 'My portfolio website',
    status: 'InProgress',
    startDate: '2023-01-01',
  };

  beforeAll(async () => {
    await startTestDb();
    app = createApp();
    await authService.registerAdmin('project.test@test.com', 'Password1!');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'project.test@test.com', password: 'Password1!' });
    token = loginRes.body.data.token as string;
  });

  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  // ─── POST /api/admin/projects ─────────────────────────────────────────────

  describe('POST /api/admin/projects', () => {
    it('creates a project and returns 201', async () => {
      const res = await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Portfolio Site');
    });

    it('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'PLANNING' });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_INPUT');
    });

    it('returns 400 for invalid projectUrl', async () => {
      const res = await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...samplePayload, projectUrl: 'not-a-url' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).post('/api/admin/projects').send(samplePayload);
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/admin/projects ──────────────────────────────────────────────

  describe('GET /api/admin/projects', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);
      await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...samplePayload, name: 'Second Project', status: 'Deployed' });
    });

    it('returns all projects with pagination', async () => {
      const res = await request(app)
        .get('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/api/admin/projects?status=Deployed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('Deployed');
    });
  });

  // ─── GET /api/admin/projects/:id ─────────────────────────────────────────

  describe('GET /api/admin/projects/:id', () => {
    it('returns a single project with skillIds', async () => {
      const createRes = await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      const projectId = createRes.body.data.id as string;

      const res = await request(app)
        .get(`/api/admin/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.skillIds).toBeDefined();
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app)
        .get('/api/admin/projects/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PUT /api/admin/projects/:id/featured ────────────────────────────────

  describe('PUT /api/admin/projects/:id/featured', () => {
    it('sets isFeatured to true', async () => {
      const createRes = await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      const projectId = createRes.body.data.id as string;

      const res = await request(app)
        .put(`/api/admin/projects/${projectId}/featured`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isFeatured: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isFeatured).toBe(true);
    });

    it('returns 400 when isFeatured is missing', async () => {
      const createRes = await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      const projectId = createRes.body.data.id as string;

      const res = await request(app)
        .put(`/api/admin/projects/${projectId}/featured`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE /api/admin/projects/:id ──────────────────────────────────────

  describe('DELETE /api/admin/projects/:id', () => {
    it('soft-deletes and returns 204', async () => {
      const createRes = await request(app)
        .post('/api/admin/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload);

      const projectId = createRes.body.data.id as string;

      const res = await request(app)
        .delete(`/api/admin/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await request(app)
        .delete('/api/admin/projects/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
