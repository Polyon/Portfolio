/**
 * Integration tests for Email Template Management API.
 * TDD Phase: RED — must FAIL before T024/T025 are implemented.
 *
 * Coverage targets (T023):
 *  - GET /api/admin/email-templates returns exactly 6 descriptors with name, queryType, recipientRole, description
 *  - POST .../SERVICE_INQUIRY_SENDER/preview with valid variables returns { success: true, data: { html, text } }
 *  - POST .../preview with missing variables uses fallback values without error
 *  - POST .../UNKNOWN_TEMPLATE/preview returns 400
 *  - Unauthenticated requests to both endpoints return 401
 */

import supertest from 'supertest';
import { startTestDb, clearTestDb, stopTestDb } from '../../../infrastructure/database/__test__/test-db';
import { createApp } from '../../../app';
import { signAccessToken } from '../../../infrastructure/auth/jwt.service';
import { EmailTemplate } from '../../../infrastructure/email/types';
import { QueryType } from '../../../domain/enums/query-type.enum';
import type { Application } from 'express';

function makeAdminJwt(): string {
  return signAccessToken({ sub: 'admin-001', email: 'admin@portfolio.dev', role: 'ADMIN' });
}

describe('Email Template Management — /api/admin/email-templates', () => {
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
    it('GET /api/admin/email-templates returns 401', async () => {
      const res = await supertest(app).get('/api/admin/email-templates');
      expect(res.status).toBe(401);
    });

    it('POST /api/admin/email-templates/:name/preview returns 401', async () => {
      const res = await supertest(app)
        .post('/api/admin/email-templates/SERVICE_INQUIRY_SENDER/preview')
        .send({ variables: {} });
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/admin/email-templates ──────────────────────────────────────

  describe('GET /api/admin/email-templates', () => {
    it('returns 200 with exactly 6 descriptors', async () => {
      const res = await supertest(app)
        .get('/api/admin/email-templates')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(6);
    });

    it('each descriptor has name, queryType, recipientRole, description', async () => {
      const res = await supertest(app)
        .get('/api/admin/email-templates')
        .set('Authorization', `Bearer ${token}`);

      for (const d of res.body.data) {
        expect(typeof d.name).toBe('string');
        expect(typeof d.queryType).toBe('string');
        expect(typeof d.recipientRole).toBe('string');
        expect(typeof d.description).toBe('string');
        expect(d.description.length).toBeGreaterThan(0);
      }
    });

    it('covers all 6 EmailTemplate enum values exactly once', async () => {
      const res = await supertest(app)
        .get('/api/admin/email-templates')
        .set('Authorization', `Bearer ${token}`);

      const names: string[] = res.body.data.map((d: { name: string }) => d.name);
      const allValues = Object.values(EmailTemplate);
      expect(names.sort()).toEqual(allValues.sort());
    });

    it('each descriptor has valid queryType (SERVICE or GENERAL)', async () => {
      const res = await supertest(app)
        .get('/api/admin/email-templates')
        .set('Authorization', `Bearer ${token}`);

      const validQueryTypes = Object.values(QueryType);
      for (const d of res.body.data) {
        expect(validQueryTypes).toContain(d.queryType);
      }
    });

    it('each descriptor has valid recipientRole (SENDER, RECEIVER, or REPLY)', async () => {
      const res = await supertest(app)
        .get('/api/admin/email-templates')
        .set('Authorization', `Bearer ${token}`);

      const validRoles = ['SENDER', 'RECEIVER', 'REPLY'];
      for (const d of res.body.data) {
        expect(validRoles).toContain(d.recipientRole);
      }
    });
  });

  // ─── POST /api/admin/email-templates/:templateName/preview ───────────────

  describe('POST /api/admin/email-templates/:templateName/preview', () => {
    it('returns 200 with { html, text } for SERVICE_INQUIRY_SENDER with valid variables', async () => {
      const res = await supertest(app)
        .post('/api/admin/email-templates/SERVICE_INQUIRY_SENDER/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({
          variables: {
            visitorName:    'Alice',
            visitorEmail:   'alice@example.com',
            subject:        'I need a website',
            messageBody:    'I would like to discuss a project with you.',
            messageSummary: 'I would like to discuss...',
            queryTypeLabel: 'Service Inquiry',
            ownerName:      'Portfolio Owner',
            portfolioUrl:   'https://portfolio.dev',
            submittedAt:    '2026-01-01T09:00:00Z',
            replySlaHours:  48,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.html).toBe('string');
      expect(typeof res.body.data.text).toBe('string');
      expect(res.body.data.html.length).toBeGreaterThan(0);
      expect(res.body.data.text.length).toBeGreaterThan(0);
    });

    it('returns 200 with fallback values when variables are omitted', async () => {
      const res = await supertest(app)
        .post('/api/admin/email-templates/GENERAL_INQUIRY_SENDER/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ variables: {} });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.html).toBe('string');
      expect(res.body.data.html.length).toBeGreaterThan(0);
    });

    it('returns 200 with no variables field — body entirely omitted', async () => {
      const res = await supertest(app)
        .post('/api/admin/email-templates/SERVICE_INQUIRY_RECEIVER/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('renders all 6 template variants without error', async () => {
      const allTemplates = Object.values(EmailTemplate);
      for (const name of allTemplates) {
        const res = await supertest(app)
          .post(`/api/admin/email-templates/${name}/preview`)
          .set('Authorization', `Bearer ${token}`)
          .send({ variables: {} });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    it('returns 400 for an unknown template name', async () => {
      const res = await supertest(app)
        .post('/api/admin/email-templates/UNKNOWN_TEMPLATE/preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ variables: {} });

      expect(res.status).toBe(400);
    });

    it('returns 400 for an empty templateName segment', async () => {
      const res = await supertest(app)
        .post('/api/admin/email-templates//preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ variables: {} });

      // Express won't route this — 404 is also acceptable
      expect([400, 404]).toContain(res.status);
    });
  });
});
