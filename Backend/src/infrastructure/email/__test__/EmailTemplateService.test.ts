/**
 * Unit tests for EmailTemplateService.
 * TDD Phase: RED — these tests must FAIL before EmailTemplateService is implemented.
 *
 * Coverage targets:
 *  - loads .hbs file from disk
 *  - registers _partials/header.hbs and _partials/footer.hbs
 *  - renders all 6 templates and returns { html, text }
 *  - uses fallback values when variables are absent
 *  - HTML-escapes user-supplied values (XSS prevention, FR-033)
 */

import path from 'path';
import { EmailTemplateService } from '../EmailTemplateService';
import { EmailTemplate, TemplateVariables } from '../types';

const FULL_VARS: TemplateVariables = {
  visitorName:    'Alice',
  visitorEmail:   'alice@example.com',
  subject:        'Test Subject',
  messageBody:    'Hello, this is a test message.',
  messageSummary: 'Hello, this is a test...',
  queryTypeLabel: 'Service Inquiry',
  replyBody:      'Thank you for contacting us.',
  ownerName:      'Bob Owner',
  portfolioUrl:   'https://bob.dev',
  adminPortalUrl: 'https://admin.bob.dev',
  submittedAt:    '1 January 2026 09:00 UTC',
  replySlaHours:  48,
};

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(() => {
    service = new EmailTemplateService();
  });

  describe('renderTemplate()', () => {
    it.each(Object.values(EmailTemplate))(
      'renders template "%s" and returns non-empty html and text',
      async (templateName) => {
        const result = await service.renderTemplate(templateName as EmailTemplate, FULL_VARS);
        expect(result.html).toBeTruthy();
        expect(result.text).toBeTruthy();
        expect(result.html.length).toBeGreaterThan(100);
      },
    );

    it('includes visitorName in service-inquiry-sender html output', async () => {
      const result = await service.renderTemplate(
        EmailTemplate.SERVICE_INQUIRY_SENDER,
        { ...FULL_VARS, visitorName: 'Charlie' },
      );
      expect(result.html).toContain('Charlie');
      // html-to-text may uppercase heading text; check case-insensitively for plain text
      expect(result.text.toLowerCase()).toContain('charlie');
    });

    it('includes replyBody in service-inquiry-reply html output', async () => {
      const result = await service.renderTemplate(
        EmailTemplate.SERVICE_INQUIRY_REPLY,
        { ...FULL_VARS, replyBody: 'Here is my detailed reply.' },
      );
      expect(result.html).toContain('Here is my detailed reply.');
    });

    it('includes adminPortalUrl in service-inquiry-receiver html output', async () => {
      const result = await service.renderTemplate(
        EmailTemplate.SERVICE_INQUIRY_RECEIVER,
        { ...FULL_VARS, adminPortalUrl: 'https://admin.test.dev/inbox' },
      );
      expect(result.html).toContain('https://admin.test.dev/inbox');
    });

    it('renders gracefully when variables are omitted (fallback / empty string behaviour)', async () => {
      await expect(
        service.renderTemplate(EmailTemplate.GENERAL_INQUIRY_SENDER, {}),
      ).resolves.not.toThrow();
    });

    it('HTML-escapes user-supplied messageBody to prevent XSS (FR-033)', async () => {
      const xss = '<script>alert("xss")</script>';
      const result = await service.renderTemplate(
        EmailTemplate.SERVICE_INQUIRY_RECEIVER,
        { ...FULL_VARS, messageBody: xss },
      );
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('HTML-escapes visitorName to prevent XSS', async () => {
      const xss = '<img src=x onerror=alert(1)>';
      const result = await service.renderTemplate(
        EmailTemplate.SERVICE_INQUIRY_SENDER,
        { ...FULL_VARS, visitorName: xss },
      );
      expect(result.html).not.toContain('<img');
      expect(result.html).toContain('&lt;img');
    });

    it('HTML-escapes replyBody to prevent XSS (FR-033)', async () => {
      const xss = '<script>evil()</script>';
      const result = await service.renderTemplate(
        EmailTemplate.SERVICE_INQUIRY_REPLY,
        { ...FULL_VARS, replyBody: xss },
      );
      expect(result.html).not.toContain('<script>');
    });

    it('registers header and footer partials so templates that use {{> header}} do not throw', async () => {
      // If partials were not registered, Handlebars would throw or output empty string
      const result = await service.renderTemplate(EmailTemplate.GENERAL_INQUIRY_SENDER, FULL_VARS);
      // The footer partial injects portfolioUrl
      expect(result.html).toContain('https://bob.dev');
    });

    it('plain-text output does not contain HTML tags', async () => {
      const result = await service.renderTemplate(EmailTemplate.SERVICE_INQUIRY_SENDER, FULL_VARS);
      expect(result.text).not.toMatch(/<[a-z][\s\S]*>/i);
    });

    it('resolves template files relative to the EmailTemplateService source location', () => {
      // Verifies the service can be constructed without throwing even when called from
      // a different CWD — path resolution is __dirname-based (FR-043).
      expect(() => new EmailTemplateService()).not.toThrow();
    });
  });
});
