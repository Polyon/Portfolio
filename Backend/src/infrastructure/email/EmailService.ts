/**
 * EmailService — dispatches transactional emails via nodemailer.
 *
 * Responsibilities:
 *  - Wraps nodemailer transport; uses jsonTransport stub when NODE_ENV === 'test'.
 *  - send(): retries up to 3 total attempts with a 2-second delay between attempts.
 *  - Logs each attempt at INFO level with { to, templateName?, attempt, success } — no PII beyond recipient address (FR-055).
 *  - renderTemplate(): thin delegation wrapper to EmailTemplateService (FR-050).
 *  - getSentEmails(): returns captured emails in test mode.
 *  - sendContactNotifications(): selects templates based on queryType and dispatches
 *    visitor confirmation + owner notification; skips owner email if ADMIN_EMAIL absent (FR-010).
 *
 * @module infrastructure/email/EmailService
 */

import type { SentMessageInfo } from 'nodemailer';
import { createEmailTransport, SMTP_FROM } from './email.config';
import { EmailTemplateService } from './EmailTemplateService';
import { EmailTemplate, SendEmailOptions, TemplateVariables } from './types';
import { QueryType } from '../../domain/enums/query-type.enum';
import type { IContactMessage } from '../database/models/ContactMessage';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/** Visitor-facing template by query type. */
const SENDER_TEMPLATE: Record<QueryType, EmailTemplate> = {
  [QueryType.SERVICE]: EmailTemplate.SERVICE_INQUIRY_SENDER,
  [QueryType.GENERAL]: EmailTemplate.GENERAL_INQUIRY_SENDER,
};

/** Owner-facing notification template by query type. */
const RECEIVER_TEMPLATE: Record<QueryType, EmailTemplate> = {
  [QueryType.SERVICE]: EmailTemplate.SERVICE_INQUIRY_RECEIVER,
  [QueryType.GENERAL]: EmailTemplate.GENERAL_INQUIRY_RECEIVER,
};

/** Human-readable label for each query type used in template variables. */
const QUERY_TYPE_LABEL: Record<QueryType, string> = {
  [QueryType.SERVICE]: 'Service Inquiry',
  [QueryType.GENERAL]: 'General Inquiry',
};

/**
 * Waits for the given number of milliseconds.
 * @param ms - Duration to sleep.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Service for dispatching outbound transactional emails.
 *
 * Inject via constructor for testability; production code uses the singleton
 * exported at the bottom of this module.
 */
export class EmailService {
  /** @internal Exposed for test-mode introspection via sendMail mock. */
  _transport = createEmailTransport();

  private readonly _templateService = new EmailTemplateService();

  /** Emails captured by the jsonTransport stub in test mode. */
  private readonly _sentEmails: SentMessageInfo[] = [];

  /**
   * Sends a single email with up to 3 total attempts.
   * Logs each attempt at INFO level (no message body / sensitive fields).
   *
   * @param options - Fully rendered email payload.
   * @throws The last error received after all attempts are exhausted.
   */
  async send(options: SendEmailOptions): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const info = await this._transport.sendMail({
          from:    SMTP_FROM,
          to:      options.to,
          subject: options.subject,
          html:    options.html,
          text:    options.text,
        });

        this._sentEmails.push(info);

        console.info('[EmailService] send attempt', {
          to:      options.to,
          attempt,
          success: true,
        });

        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        console.info('[EmailService] send attempt', {
          to:      options.to,
          attempt,
          success: false,
          error:   lastError.message,
        });

        if (attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
        }
      }
    }

    throw lastError;
  }

  /**
   * Renders the given template with variables by delegating to EmailTemplateService.
   *
   * @param name      - EmailTemplate enum value to render.
   * @param variables - Typed variable map.
   * @returns Rendered `{ html, text }` output.
   */
  async renderTemplate(
    name: EmailTemplate,
    variables: TemplateVariables,
  ): Promise<{ html: string; text: string }> {
    return this._templateService.renderTemplate(name, variables);
  }

  /**
   * Returns all emails captured by the jsonTransport stub (test mode only).
   *
   * @returns Array of SentMessageInfo objects; empty array outside test mode.
   */
  getSentEmails(): SentMessageInfo[] {
    return this._sentEmails;
  }

  /**
   * Sends the visitor confirmation and owner notification emails for a new contact message.
   *
   * Template selection is based on `message.queryType`:
   *  - SERVICE → SERVICE_INQUIRY_SENDER (visitor) + SERVICE_INQUIRY_RECEIVER (owner)
   *  - GENERAL → GENERAL_INQUIRY_SENDER (visitor) + GENERAL_INQUIRY_RECEIVER (owner)
   *
   * Owner notification is skipped (with a WARN log) if ADMIN_EMAIL is not set (FR-010).
   *
   * @param message - The persisted IContactMessage document.
   * @throws Any error from send() after retries are exhausted; callers should use fire-and-forget.
   */
  async sendContactNotifications(message: IContactMessage): Promise<void> {
    const queryType     = message.queryType as QueryType ?? QueryType.GENERAL;
    const ownerName     = process.env['OWNER_NAME']       ?? 'Portfolio Owner';
    const portfolioUrl  = process.env['PORTFOLIO_URL']    ?? '';
    const adminPortalUrl = process.env['ADMIN_PORTAL_URL'] ?? '';
    const replySlaHours = Number(process.env['REPLY_SLA_HOURS'] ?? 48);
    const adminEmail    = process.env['ADMIN_EMAIL'];

    const messageSummary = message.message.length > 200
      ? `${message.message.slice(0, 200)}…`
      : message.message;

    const sharedVars: TemplateVariables = {
      visitorName:    message.name,
      visitorEmail:   message.email,
      subject:        message.subject,
      messageBody:    message.message,
      messageSummary,
      queryTypeLabel: QUERY_TYPE_LABEL[queryType],
      ownerName,
      portfolioUrl,
      adminPortalUrl,
      submittedAt:    message.createdAt.toUTCString(),
      replySlaHours,
    };

    // ── 1. Visitor confirmation ───────────────────────────────────────────────
    const senderTemplate = SENDER_TEMPLATE[queryType];
    const { html: senderHtml, text: senderText } = await this._templateService.renderTemplate(
      senderTemplate,
      sharedVars,
    );

    await this.send({
      to:      message.email,
      subject: `We received your enquiry — ${message.subject ?? 'Contact Form'}`,
      html:    senderHtml,
      text:    senderText,
    });

    // ── 2. Owner notification ─────────────────────────────────────────────────
    if (!adminEmail) {
      console.warn(
        '[EmailService] ADMIN_EMAIL is not set — skipping owner notification (FR-010). ' +
        'Set ADMIN_EMAIL in your environment to enable owner notifications.',
      );
      return;
    }

    const receiverTemplate = RECEIVER_TEMPLATE[queryType];
    const { html: receiverHtml, text: receiverText } = await this._templateService.renderTemplate(
      receiverTemplate,
      sharedVars,
    );

    await this.send({
      to:      adminEmail,
      subject: `[New ${QUERY_TYPE_LABEL[queryType]}] ${message.subject ?? 'Contact Form'} — ${message.name}`,
      html:    receiverHtml,
      text:    receiverText,
    });
  }
}

/** Singleton instance shared across application layer services. */
export const emailService = new EmailService();
