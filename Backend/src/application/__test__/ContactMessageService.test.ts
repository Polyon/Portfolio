/**
 * Unit tests for ContactMessageService (updated for feature 006).
 * TDD Phase: RED — tests covering queryType persistence and fire-and-forget email dispatch
 * must FAIL before the implementation updates are applied.
 *
 * Coverage targets (T012):
 *  - persists queryType: SERVICE when provided
 *  - defaults to queryType: GENERAL when queryType is omitted
 *  - fire-and-forget email dispatch does not delay the returned Promise
 *  - SMTP failure inside fire-and-forget does NOT cause send() to throw
 */

import { startTestDb, clearTestDb, stopTestDb } from '../../infrastructure/database/__test__/test-db';
import { ContactMessageService } from '../ContactMessageService';
import { ContactMessage } from '../../infrastructure/database/models/ContactMessage';
import { QueryType } from '../../domain/enums/query-type.enum';

const BASE_DTO = {
  name:      'Alice',
  email:     'alice@example.com',
  subject:   'Test subject',
  message:   'Hello, this is a test message body.',
  ipAddress: '127.0.0.1',
  userAgent: 'jest-test-agent',
};

describe('ContactMessageService', () => {
  let service: ContactMessageService;

  beforeAll(async () => { await startTestDb(); });
  afterEach(async () => { await clearTestDb(); });
  afterAll(async () => { await stopTestDb(); });

  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    process.env['ADMIN_EMAIL'] = 'admin@portfolio.dev';
    service = new ContactMessageService();
  });

  // ─── queryType persistence ────────────────────────────────────────────────

  describe('queryType field', () => {
    it('persists queryType: SERVICE when provided', async () => {
      const saved = await service.send({ ...BASE_DTO, queryType: QueryType.SERVICE });
      expect(saved.queryType).toBe(QueryType.SERVICE);

      const fromDb = await ContactMessage.findById(saved._id).lean();
      expect(fromDb?.queryType).toBe(QueryType.SERVICE);
    });

    it('defaults to queryType: GENERAL when queryType is omitted', async () => {
      const saved = await service.send(BASE_DTO);
      expect(saved.queryType).toBe(QueryType.GENERAL);

      const fromDb = await ContactMessage.findById(saved._id).lean();
      expect(fromDb?.queryType).toBe(QueryType.GENERAL);
    });

    it('persists queryType: GENERAL when explicitly provided', async () => {
      const saved = await service.send({ ...BASE_DTO, queryType: QueryType.GENERAL });
      expect(saved.queryType).toBe(QueryType.GENERAL);
    });
  });

  // ─── fire-and-forget email dispatch ──────────────────────────────────────

  describe('email dispatch (fire-and-forget)', () => {
    it('send() returns promptly — does not await email dispatch', async () => {
      const start = Date.now();
      await service.send({ ...BASE_DTO });
      const elapsed = Date.now() - start;
      // Email dispatch uses setImmediate so it should not block the response
      // 2000 ms is well above what a DB insert should take — confirms no retry sleep blocking
      expect(elapsed).toBeLessThan(2000);
    });

    it('SMTP failure during fire-and-forget does NOT cause send() to reject', async () => {
      // We inject a broken email service to simulate SMTP failure
      const badService = new ContactMessageService();
      // Override the internal email service to simulate failure
      const emailServiceProp = Object.getOwnPropertyDescriptor(badService, '_emailService')
        ?? Object.getOwnPropertyDescriptors(Object.getPrototypeOf(badService))['_emailService'];

      // Monkey-patch the emailService to throw
      (badService as unknown as Record<string, unknown>)['_emailService'] = {
        sendContactNotifications: jest.fn().mockRejectedValue(new Error('SMTP down')),
      };

      // The send() should still resolve
      await expect(badService.send(BASE_DTO)).resolves.not.toThrow();
    });

    it('persists the message to DB regardless of email dispatch outcome', async () => {
      const badService = new ContactMessageService();
      (badService as unknown as Record<string, unknown>)['_emailService'] = {
        sendContactNotifications: jest.fn().mockRejectedValue(new Error('SMTP down')),
      };

      const saved = await badService.send({ ...BASE_DTO, email: 'persist@example.com' });
      const fromDb = await ContactMessage.findById(saved._id).lean();
      expect(fromDb).not.toBeNull();
      expect(fromDb?.email).toBe('persist@example.com');
    });
  });

  // ─── field trimming (existing behaviour, regression guard) ───────────────

  describe('field trimming', () => {
    it('trims whitespace from name and email', async () => {
      const saved = await service.send({
        ...BASE_DTO,
        name:  '  Bob  ',
        email: '  BOB@EXAMPLE.COM  ',
      });
      expect(saved.name).toBe('Bob');
      expect(saved.email).toBe('bob@example.com');
    });
  });
});
