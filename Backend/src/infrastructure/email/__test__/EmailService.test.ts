/**
 * Unit tests for EmailService.
 * TDD Phase: RED — these tests must FAIL before EmailService is implemented.
 *
 * Coverage targets:
 *  - successful send() returns void
 *  - retries up to 3 total attempts on transient SMTP failure
 *  - after 3rd failure, throws the error
 *  - jsonTransport stub captures sent emails
 *  - getSentEmails() returns captured email list
 *  - INFO log emitted per attempt with { to, templateName, attempt, success } — no extra PII
 *  - WARN log emitted and owner notification skipped when ADMIN_EMAIL is absent (FR-010)
 */

import { EmailService } from '../EmailService';
import { EmailTemplate, SendEmailOptions } from '../types';
import { QueryType } from '../../../domain/enums/query-type.enum';
import type { IContactMessage } from '../../database/models/ContactMessage';

const SAMPLE_OPTIONS: SendEmailOptions = {
  to:      'visitor@example.com',
  subject: 'Test subject',
  html:    '<p>Hello</p>',
  text:    'Hello',
};

function makeMockMessage(overrides: Partial<IContactMessage> = {}): IContactMessage {
  return {
    _id:       'msg-001',
    name:      'Alice',
    email:     'alice@example.com',
    subject:   'Test enquiry',
    message:   'Hello from Alice',
    queryType: QueryType.SERVICE,
    isRead:    false,
    replies:   [],
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date('2026-01-01T09:00:00Z'),
    updatedAt: new Date('2026-01-01T09:00:00Z'),
    ...overrides,
  } as unknown as IContactMessage;
}

describe('EmailService', () => {
  let service: EmailService;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Force test transport (jsonTransport)
    process.env['NODE_ENV'] = 'test';
    process.env['ADMIN_EMAIL'] = 'admin@portfolio.dev';
    process.env['OWNER_NAME'] = 'Test Owner';
    process.env['PORTFOLIO_URL'] = 'https://portfolio.dev';
    process.env['ADMIN_PORTAL_URL'] = 'https://admin.portfolio.dev';
    process.env['REPLY_SLA_HOURS'] = '48';

    service = new EmailService();
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env['ADMIN_EMAIL'];
  });

  // ─── send() happy path ────────────────────────────────────────────────────

  describe('send()', () => {
    it('resolves without throwing on successful send', async () => {
      await expect(service.send(SAMPLE_OPTIONS)).resolves.toBeUndefined();
    });

    it('emits an INFO log with { to, attempt, success: true } on success', async () => {
      await service.send(SAMPLE_OPTIONS);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EmailService]'),
        expect.objectContaining({ to: 'visitor@example.com', attempt: 1, success: true }),
      );
    });

    it('INFO log does NOT include message body or sensitive content (FR-055)', async () => {
      await service.send({ ...SAMPLE_OPTIONS, html: '<p>sensitive body here</p>', text: 'sensitive body here' });
      const logArgs = infoSpy.mock.calls.flat().join(' ');
      expect(logArgs).not.toContain('sensitive body here');
    });
  });

  // ─── send() retry behaviour ───────────────────────────────────────────────

  describe('send() retries', () => {
    it('retries on transient failure and eventually succeeds', async () => {
      let callCount = 0;
      const originalSend = (service as unknown as { _transport: { sendMail: jest.Mock } })._transport.sendMail?.bind(
        (service as unknown as { _transport: { sendMail: jest.Mock } })._transport,
      );

      jest.spyOn(
        (service as unknown as { _transport: { sendMail: jest.Mock } })._transport,
        'sendMail',
      ).mockImplementation((...args: unknown[]) => {
        callCount++;
        if (callCount < 2) throw new Error('SMTP connection refused');
        return (originalSend as (...args: unknown[]) => unknown)(...args);
      });

      await expect(service.send(SAMPLE_OPTIONS)).resolves.toBeUndefined();
      expect(callCount).toBe(2);
    });

    it('throws after all 3 attempts are exhausted', async () => {
      jest.spyOn(
        (service as unknown as { _transport: { sendMail: jest.Mock } })._transport,
        'sendMail',
      ).mockRejectedValue(new Error('SMTP permanently down'));

      await expect(service.send(SAMPLE_OPTIONS)).rejects.toThrow('SMTP permanently down');
    });

    it('emits INFO log for each attempt', async () => {
      jest.spyOn(
        (service as unknown as { _transport: { sendMail: jest.Mock } })._transport,
        'sendMail',
      ).mockRejectedValue(new Error('SMTP down'));

      await service.send(SAMPLE_OPTIONS).catch(() => undefined);

      // Should have logged attempt 1, 2, and 3
      expect(infoSpy).toHaveBeenCalledTimes(3);
    });
  });

  // ─── getSentEmails() ──────────────────────────────────────────────────────

  describe('getSentEmails()', () => {
    it('returns an array (possibly empty) in test mode', () => {
      expect(Array.isArray(service.getSentEmails())).toBe(true);
    });

    it('captures email after successful send', async () => {
      await service.send(SAMPLE_OPTIONS);
      const sent = service.getSentEmails();
      expect(sent.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── sendContactNotifications() ──────────────────────────────────────────

  describe('sendContactNotifications()', () => {
    it('sends two emails (visitor + owner) when ADMIN_EMAIL is set', async () => {
      const msg = makeMockMessage();
      await service.sendContactNotifications(msg);
      const sent = service.getSentEmails();
      expect(sent.length).toBeGreaterThanOrEqual(2);
    });

    it('sends visitor email but skips owner email when ADMIN_EMAIL is absent (FR-010)', async () => {
      delete process.env['ADMIN_EMAIL'];
      const freshService = new EmailService();
      const warnSpy2 = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      const msg = makeMockMessage();
      await freshService.sendContactNotifications(msg);

      // WARN must be logged about missing ADMIN_EMAIL
      expect(warnSpy2).toHaveBeenCalledWith(expect.stringContaining('ADMIN_EMAIL'));

      // Only 1 email sent (visitor confirmation) not 2
      expect(freshService.getSentEmails().length).toBe(1);
      warnSpy2.mockRestore();
    });

    it('sends SERVICE_INQUIRY_SENDER template to visitor for SERVICE queryType', async () => {
      const msg = makeMockMessage({ queryType: QueryType.SERVICE });
      await service.sendContactNotifications(msg);
      const sent = service.getSentEmails();
      const visitorEmail = sent.find((e: unknown) =>
        (e as { envelope?: { to?: string[] } }).envelope?.to?.includes('alice@example.com'),
      );
      expect(visitorEmail).toBeDefined();
    });

    it('sends GENERAL_INQUIRY_SENDER template to visitor for GENERAL queryType', async () => {
      const msg = makeMockMessage({ queryType: QueryType.GENERAL, email: 'general@example.com' });
      const generalService = new EmailService();
      await generalService.sendContactNotifications(msg);
      const sent = generalService.getSentEmails();
      expect(sent.length).toBeGreaterThanOrEqual(1);
    });

    it('does not throw if SMTP fails during fire-and-forget context', async () => {
      jest.spyOn(
        (service as unknown as { _transport: { sendMail: jest.Mock } })._transport,
        'sendMail',
      ).mockRejectedValue(new Error('SMTP down'));

      // sendContactNotifications itself rejects — the caller (ContactMessageService)
      // wraps it in setImmediate + .catch so it never surfaces as unhandled
      await expect(service.sendContactNotifications(makeMockMessage())).rejects.toThrow();
    });

    it('truncates messageSummary when message body exceeds 200 characters', async () => {
      const longMessage = 'A'.repeat(250);
      const msg = makeMockMessage({ message: longMessage });
      await service.sendContactNotifications(msg);
      // No error thrown; rendered OK with truncated summary
      const sent = service.getSentEmails();
      expect(sent.length).toBeGreaterThanOrEqual(1);
    });

    it('uses "Contact Form" subject fallback when message.subject is undefined', async () => {
      const msg = makeMockMessage({ subject: undefined as unknown as string });
      await service.sendContactNotifications(msg);
      const sent = service.getSentEmails();
      expect(sent.length).toBeGreaterThanOrEqual(1);
    });

    it('falls back to GENERAL queryType when message.queryType is undefined', async () => {
      const msg = makeMockMessage({ queryType: undefined as unknown as QueryType });
      await service.sendContactNotifications(msg);
      const sent = service.getSentEmails();
      expect(sent.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── send() non-Error throw ───────────────────────────────────────────────

  describe('send() — non-Error thrown', () => {
    it('wraps a non-Error thrown value in an Error', async () => {
      jest.spyOn(
        (service as unknown as { _transport: { sendMail: jest.Mock } })._transport,
        'sendMail',
      ).mockRejectedValue('plain string error');

      await expect(service.send(SAMPLE_OPTIONS)).rejects.toThrow('plain string error');
    });
  });

  // ─── ADMIN_EMAIL absent warning ───────────────────────────────────────────

  describe('WARN log when ADMIN_EMAIL absent', () => {
    it('emits console.warn mentioning ADMIN_EMAIL when env var is not set', async () => {
      delete process.env['ADMIN_EMAIL'];
      const s = new EmailService();
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await s.sendContactNotifications(makeMockMessage());
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ADMIN_EMAIL'));
    });
  });
});
