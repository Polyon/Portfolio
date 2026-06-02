/**
 * Integration tests for admin contact message inbox HTTP endpoints.
 * TDD Phase: RED — must FAIL before T019 is implemented.
 *
 * Coverage targets (T017b):
 *  - GET /api/admin/contact/messages returns paginated list with correct shape
 *  - GET /api/admin/contact/messages/stats returns counts
 *  - GET /api/admin/contact/messages/:id returns full detail
 *  - PATCH /api/admin/contact/messages/:id/read updates isRead
 *  - DELETE /api/admin/contact/messages/:id removes message and returns { success: true }
 *  - All five endpoints return 401 without a valid JWT
 *
 * Uses supertest + mongodb-memory-server + valid admin JWT (Constitution §III NON-NEGOTIABLE).
 */

import supertest from 'supertest';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { createApp } from '../../../app';
import { ContactMessage } from '../../../infrastructure/database/models/ContactMessage';
import { signAccessToken } from '../../../infrastructure/auth/jwt.service';
import { QueryType } from '../../../domain/enums/query-type.enum';
import type { Application } from 'express';

function makeAdminJwt(sub = 'admin-001'): string {
  return signAccessToken({ sub, email: 'admin@portfolio.dev', role: 'ADMIN' });
}

const VALID_MSG = {
  name:      'Alice',
  email:     'alice@example.com',
  subject:   'Test subject',
  message:   'Hello, I have a question for you.',
  queryType: QueryType.SERVICE,
  isRead:    false,
};

describe('Admin contact message inbox — HTTP integration', () => {
  let app: Application;
  let token: string;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    await startTestDb();
    app = createApp();
    token = makeAdminJwt();
  });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  // ─── 401 guards ───────────────────────────────────────────────────────────

  describe('401 without JWT', () => {
    it('GET /api/admin/contact/messages returns 401', async () => {
      const res = await supertest(app).get('/api/admin/contact/messages');
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/contact/messages/stats returns 401', async () => {
      const res = await supertest(app).get('/api/admin/contact/messages/stats');
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/contact/messages/:id returns 401', async () => {
      const res = await supertest(app).get('/api/admin/contact/messages/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
    });

    it('PATCH /api/admin/contact/messages/:id/read returns 401', async () => {
      const res = await supertest(app)
        .patch('/api/admin/contact/messages/507f1f77bcf86cd799439011/read')
        .send({ isRead: true });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/admin/contact/messages/:id returns 401', async () => {
      const res = await supertest(app).delete('/api/admin/contact/messages/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/admin/contact/messages ─────────────────────────────────────

  describe('GET /api/admin/contact/messages', () => {
    it('returns 200 with paginated list and correct shape', async () => {
      await ContactMessage.create(VALID_MSG);

      const res = await supertest(app)
        .get('/api/admin/contact/messages')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);

      // Shape check — must have required list item fields
      const item = res.body.data[0];
      expect(item.id).toBeDefined();
      expect(item.name).toBe('Alice');
      expect(item.email).toBe('alice@example.com');
      expect(item.queryType).toBe(QueryType.SERVICE);
      expect(typeof item.isRead).toBe('boolean');
      expect(typeof item.replyCount).toBe('number');
      // message body must NOT be included (FR-017)
      expect(item.message).toBeUndefined();
    });

    it('supports queryType filter via query param', async () => {
      await ContactMessage.create(VALID_MSG);
      await ContactMessage.create({ ...VALID_MSG, email: 'g@t.com', queryType: QueryType.GENERAL });

      const res = await supertest(app)
        .get('/api/admin/contact/messages?queryType=SERVICE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].queryType).toBe(QueryType.SERVICE);
    });

    it('supports isRead filter via query param', async () => {
      await ContactMessage.create({ ...VALID_MSG, isRead: false });
      await ContactMessage.create({ ...VALID_MSG, email: 'r@t.com', isRead: true });

      const res = await supertest(app)
        .get('/api/admin/contact/messages?isRead=false')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].isRead).toBe(false);
    });

    it('returns empty list with zero total when no messages exist', async () => {
      const res = await supertest(app)
        .get('/api/admin/contact/messages')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // ─── GET /api/admin/contact/messages/stats ────────────────────────────────

  describe('GET /api/admin/contact/messages/stats', () => {
    it('returns 200 with stats shape', async () => {
      await ContactMessage.create({ ...VALID_MSG, isRead: false, queryType: QueryType.SERVICE });
      await ContactMessage.create({ ...VALID_MSG, email: 'g@t.com', isRead: true, queryType: QueryType.GENERAL });

      const res = await supertest(app)
        .get('/api/admin/contact/messages/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.unread).toBe(1);
      expect(res.body.data.serviceQueries).toBe(1);
      expect(res.body.data.generalQueries).toBe(1);
    });

    it('returns zeros when no messages exist', async () => {
      const res = await supertest(app)
        .get('/api/admin/contact/messages/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ total: 0, unread: 0, serviceQueries: 0, generalQueries: 0 });
    });
  });

  // ─── GET /api/admin/contact/messages/:id ─────────────────────────────────

  describe('GET /api/admin/contact/messages/:id', () => {
    it('returns 200 with full message detail including replies array', async () => {
      const doc = await ContactMessage.create(VALID_MSG);

      const res = await supertest(app)
        .get(`/api/admin/contact/messages/${doc._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(doc._id.toString());
      expect(res.body.data.message).toBe(VALID_MSG.message);
      expect(Array.isArray(res.body.data.replies)).toBe(true);
    });

    it('returns 404 for non-existent ID', async () => {
      const res = await supertest(app)
        .get('/api/admin/contact/messages/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /api/admin/contact/messages/:id/read ───────────────────────────

  describe('PATCH /api/admin/contact/messages/:id/read', () => {
    it('returns 200 and updates isRead to true', async () => {
      const doc = await ContactMessage.create({ ...VALID_MSG, isRead: false });

      const res = await supertest(app)
        .patch(`/api/admin/contact/messages/${doc._id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isRead: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
    });

    it('returns 200 and updates isRead to false', async () => {
      const doc = await ContactMessage.create({ ...VALID_MSG, isRead: true });

      const res = await supertest(app)
        .patch(`/api/admin/contact/messages/${doc._id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isRead: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(false);
    });

    it('returns 400 when isRead is not boolean', async () => {
      const doc = await ContactMessage.create(VALID_MSG);

      const res = await supertest(app)
        .patch(`/api/admin/contact/messages/${doc._id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isRead: 'yes' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent ID', async () => {
      const res = await supertest(app)
        .patch('/api/admin/contact/messages/507f1f77bcf86cd799439011/read')
        .set('Authorization', `Bearer ${token}`)
        .send({ isRead: true });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /api/admin/contact/messages/:id ───────────────────────────────

  describe('DELETE /api/admin/contact/messages/:id', () => {
    it('returns 200 with { success: true } and removes message', async () => {
      const doc = await ContactMessage.create(VALID_MSG);

      const res = await supertest(app)
        .delete(`/api/admin/contact/messages/${doc._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const fromDb = await ContactMessage.findById(doc._id).lean();
      expect(fromDb).toBeNull();
    });

    it('returns 404 for non-existent ID', async () => {
      const res = await supertest(app)
        .delete('/api/admin/contact/messages/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
