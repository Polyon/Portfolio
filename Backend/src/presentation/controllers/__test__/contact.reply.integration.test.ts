/**
 * Integration tests for POST /api/admin/contact/messages/:id/reply
 * TDD Phase: RED — must FAIL before T022 is implemented.
 *
 * Coverage targets (T020b):
 *  - 200 with reply detail on success
 *  - 502 with { success: false, message: "Failed to send reply email. Please try again." } on SMTP failure
 *  - 400 when body is empty or missing
 *  - 404 for non-existent message ID
 *  - 401 without valid JWT
 *
 * Uses supertest + mongodb-memory-server + admin JWT.
 * SMTP send() is spied on from the emailService singleton for the failure test.
 */

import supertest from 'supertest';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { createApp } from '../../../app';
import { ContactMessage } from '../../../infrastructure/database/models/ContactMessage';
import { signAccessToken } from '../../../infrastructure/auth/jwt.service';
import { emailService } from '../../../infrastructure/email/EmailService';
import { QueryType } from '../../../domain/enums/query-type.enum';
import type { Application } from 'express';

function makeAdminJwt(sub = 'admin-001'): string {
  return signAccessToken({ sub, email: 'admin@portfolio.dev', role: 'ADMIN' });
}

const VALID_MSG = {
  name:      'Alice',
  email:     'alice@example.com',
  subject:   'Service enquiry',
  message:   'Hello, I would like to discuss a project.',
  queryType: QueryType.SERVICE,
  isRead:    false,
};

describe('Admin reply endpoint — POST /api/admin/contact/messages/:id/reply', () => {
  let app: Application;
  let token: string;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['ADMIN_EMAIL'] = 'admin@portfolio.dev';
    process.env['OWNER_NAME'] = 'Test Owner';
    process.env['PORTFOLIO_URL'] = 'https://portfolio.dev';
    process.env['ADMIN_PORTAL_URL'] = 'https://admin.portfolio.dev';
    process.env['REPLY_SLA_HOURS'] = '48';
    await startTestDb();
    app = createApp();
    token = makeAdminJwt();
  });
  afterEach(async () => {
    await clearTestDb();
    jest.restoreAllMocks();
  });
  afterAll(async () => { await stopTestDb(); });

  // ─── 401 guard ────────────────────────────────────────────────────────────

  it('returns 401 without a valid JWT', async () => {
    const res = await supertest(app)
      .post('/api/admin/contact/messages/507f1f77bcf86cd799439011/reply')
      .send({ body: 'Hello!' });
    expect(res.status).toBe(401);
  });

  // ─── Success path ─────────────────────────────────────────────────────────

  it('returns 200 with reply detail on success', async () => {
    const doc = await ContactMessage.create(VALID_MSG);

    const res = await supertest(app)
      .post(`/api/admin/contact/messages/${doc._id}/reply`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Thanks for reaching out! I will be in touch.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Reply sent successfully');

    const reply = res.body.data;
    expect(typeof reply.id).toBe('string');
    expect(reply.body).toBe('Thanks for reaching out! I will be in touch.');
    expect(reply.sentBy).toBe('admin-001');
    expect(typeof reply.sentAt).toBe('string');
  });

  it('persists the reply in the database', async () => {
    const doc = await ContactMessage.create(VALID_MSG);

    await supertest(app)
      .post(`/api/admin/contact/messages/${doc._id}/reply`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Persisted reply body' });

    const updated = await ContactMessage.findById(doc._id).lean();
    expect(updated!.replies).toHaveLength(1);
    expect(updated!.replies[0]!.body).toBe('Persisted reply body');
  });

  it('uses provided subject when given', async () => {
    const doc = await ContactMessage.create(VALID_MSG);

    const res = await supertest(app)
      .post(`/api/admin/contact/messages/${doc._id}/reply`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: 'Custom subject', body: 'Reply body' });

    expect(res.status).toBe(200);
    expect(res.body.data.subject).toBe('Custom subject');
  });

  // ─── SMTP failure → 502 ───────────────────────────────────────────────────

  it('returns 502 when email send fails and does NOT persist reply', async () => {
    const doc = await ContactMessage.create(VALID_MSG);
    jest.spyOn(emailService, 'send').mockRejectedValue(new Error('SMTP connection refused'));

    const res = await supertest(app)
      .post(`/api/admin/contact/messages/${doc._id}/reply`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Should not persist' });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Failed to send reply email. Please try again.');

    // DB must not have been updated
    const fromDb = await ContactMessage.findById(doc._id).lean();
    expect(fromDb!.replies).toHaveLength(0);
  });

  // ─── Validation → 400 ────────────────────────────────────────────────────

  it('returns 400 when body is missing', async () => {
    const doc = await ContactMessage.create(VALID_MSG);

    const res = await supertest(app)
      .post(`/api/admin/contact/messages/${doc._id}/reply`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when body is an empty string', async () => {
    const doc = await ContactMessage.create(VALID_MSG);

    const res = await supertest(app)
      .post(`/api/admin/contact/messages/${doc._id}/reply`)
      .set('Authorization', `Bearer ${token}`)
      .send({ body: '   ' });

    expect(res.status).toBe(400);
  });

  // ─── 404 not found ────────────────────────────────────────────────────────

  it('returns 404 for non-existent message ID', async () => {
    const res = await supertest(app)
      .post('/api/admin/contact/messages/507f1f77bcf86cd799439011/reply')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Hello!' });

    expect(res.status).toBe(404);
  });
});
