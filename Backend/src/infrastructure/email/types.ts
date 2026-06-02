/**
 * Email infrastructure type definitions.
 * Central source of truth for all email-related enums and interfaces.
 *
 * @module infrastructure/email/types
 */

/**
 * Identifies one of the six outbound email templates.
 * Template names follow the convention: {QueryType}_INQUIRY_{role}.
 * Reference typed enum values rather than raw strings throughout the codebase (FR-048).
 */
export enum EmailTemplate {
  SERVICE_INQUIRY_SENDER   = 'SERVICE_INQUIRY_SENDER',
  SERVICE_INQUIRY_RECEIVER = 'SERVICE_INQUIRY_RECEIVER',
  SERVICE_INQUIRY_REPLY    = 'SERVICE_INQUIRY_REPLY',
  GENERAL_INQUIRY_SENDER   = 'GENERAL_INQUIRY_SENDER',
  GENERAL_INQUIRY_RECEIVER = 'GENERAL_INQUIRY_RECEIVER',
  GENERAL_INQUIRY_REPLY    = 'GENERAL_INQUIRY_REPLY',
}

/**
 * Payload passed to {@link EmailService.send} to dispatch a single outbound email.
 * Both `html` and `text` parts are required to satisfy FR-035 and FR-047.
 */
export interface SendEmailOptions {
  /** Recipient email address. */
  to:      string;
  /** Email subject line. */
  subject: string;
  /** HTML body — must be fully rendered before passing. */
  html:    string;
  /** Plain-text fallback body — auto-derived from HTML via html-to-text (FR-047). */
  text:    string;
}

/**
 * Typed variable map used to hydrate any of the six Handlebars email templates.
 * All fields are optional; templates must render gracefully when fields are absent,
 * falling back to safe placeholder values to prevent render errors (FR-042).
 */
export interface TemplateVariables {
  /** Visitor's display name from the contact form. */
  visitorName?:    string;
  /** Visitor's email address from the contact form. */
  visitorEmail?:   string;
  /** Message subject from the contact form. */
  subject?:        string;
  /** Full message body from the contact form — used in receiver templates (FR-037). */
  messageBody?:    string;
  /** Truncated preview: first 200 chars of messageBody — used in sender templates (FR-036). */
  messageSummary?: string;
  /** Human-readable classification label: "Service Inquiry" | "General Inquiry". */
  queryTypeLabel?: string;
  /** Admin reply body text — reply templates only (FR-038, FR-041). */
  replyBody?:      string;
  /** Portfolio owner's display name (from OWNER_NAME env var). */
  ownerName?:      string;
  /** Public portfolio URL (from PORTFOLIO_URL env var). */
  portfolioUrl?:   string;
  /** Admin portal deep-link URL (from ADMIN_PORTAL_URL env var) — receiver templates only. */
  adminPortalUrl?: string;
  /** Human-readable submission timestamp string. */
  submittedAt?:    string;
  /** Expected reply SLA in hours (from REPLY_SLA_HOURS env var, default 48) — sender templates only. */
  replySlaHours?:  number;
}
