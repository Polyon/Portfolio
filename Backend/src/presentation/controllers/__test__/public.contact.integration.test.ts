/**
 * Integration tests for POST /api/public/contact/message (feature 006 extension).
 * TDD Phase: RED — tests covering queryType validation must FAIL before T016 is implemented.
 *
 * Coverage targets (T012b):
 *  - valid queryType: SERVICE persists and returns 201
 *  - valid queryType: GENERAL persists and returns 201
 *  - absent queryType defaults to GENERAL and returns 201
 *  - invalid queryType: "SPAM" returns 400 with enum values listed
 *
 * Uses supertest + mongodb-memory-server (Constitution §III NON-NEGOTIABLE).
 */

import express from 'express';
import supertest from 'supertest';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import publicController from '../public.controller';
import { ContactMessage } from '../../../infrastructure/database/models/ContactMessage';
import { QueryType } from '../../../domain/enums/query-type.enum';

const app = express();
app.use(express.json());
app.use('/api/public', publicController);

const VALID_BODY = {
  name:    'Alice Tester',
  email:   'alice@example.com',
  subject: 'Integration test',
  message: 'Hello, this is a valid test message with enough length.',
};

describe('POST /api/public/contact/message — queryType (feature 006)', () => {
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['ADMIN_EMAIL'] = 'admin@portfolio.dev';
    process.env['OWNER_NAME'] = 'Test Owner';
    process.env['PORTFOLIO_URL'] = 'https://portfolio.dev';
    process.env['ADMIN_PORTAL_URL'] = 'https://admin.portfolio.dev';
    process.env['REPLY_SLA_HOURS'] = '48';
    await startTestDb();
  });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  it('returns 201 and persists queryType: SERVICE when provided', async () => {
    const res = await supertest(app)
      .post('/api/public/contact/message')
      .send({ ...VALID_BODY, queryType: QueryType.SERVICE });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const saved = await ContactMessage.findOne({ email: 'alice@example.com' }).lean();
    expect(saved?.queryType).toBe(QueryType.SERVICE);
  });

  it('returns 201 and persists queryType: GENERAL when provided', async () => {
    const res = await supertest(app)
      .post('/api/public/contact/message')
      .send({ ...VALID_BODY, email: 'general@example.com', queryType: QueryType.GENERAL });

    expect(res.status).toBe(201);

    const saved = await ContactMessage.findOne({ email: 'general@example.com' }).lean();
    expect(saved?.queryType).toBe(QueryType.GENERAL);
  });

  it('returns 201 and defaults queryType to GENERAL when not provided', async () => {
    const res = await supertest(app)
      .post('/api/public/contact/message')
      .send({ ...VALID_BODY, email: 'noquery@example.com' });

    expect(res.status).toBe(201);

    const saved = await ContactMessage.findOne({ email: 'noquery@example.com' }).lean();
    expect(saved?.queryType).toBe(QueryType.GENERAL);
  });

  it('returns 400 with enum values listed when queryType is invalid', async () => {
    const res = await supertest(app)
      .post('/api/public/contact/message')
      .send({ ...VALID_BODY, email: 'invalid@example.com', queryType: 'SPAM' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // Response should mention valid enum values
    expect(res.body.message).toMatch(/SERVICE|GENERAL/i);
  });

  it('still returns 201 for existing fields (regression guard)', async () => {
    const res = await supertest(app)
      .post('/api/public/contact/message')
      .send(VALID_BODY);

    expect(res.status).toBe(201);
  });

  it('still returns 400 when required fields are missing (regression guard)', async () => {
    const res = await supertest(app)
      .post('/api/public/contact/message')
      .send({ email: 'missing@example.com', message: 'No name provided here.' });

    expect(res.status).toBe(400);
  });
});
