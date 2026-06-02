import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Creates a configured nodemailer Transporter.
 *
 * In test environments (`NODE_ENV === 'test'`) a `jsonTransport` stub is returned so
 * unit tests never send live emails. All sent mail is serialised to JSON and can be
 * inspected via `transporter.sentMail` (populated by the jsonTransport driver).
 *
 * In all other environments a real SMTP transport is created from environment variables:
 * - `SMTP_HOST`   — SMTP server hostname (required)
 * - `SMTP_PORT`   — SMTP server port (default: 587)
 * - `SMTP_SECURE` — Use TLS on connect; set `'true'` for port 465 (default: false)
 * - `SMTP_USER`   — SMTP authentication username (required)
 * - `SMTP_PASS`   — SMTP authentication password (required)
 *
 * @returns A configured nodemailer Transporter instance.
 */
export function createEmailTransport(): Transporter {
  if (process.env['NODE_ENV'] === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host:   process.env['SMTP_HOST'],
    port:   Number(process.env['SMTP_PORT']) || 587,
    secure: process.env['SMTP_SECURE'] === 'true',
    auth: {
      user: process.env['SMTP_USER'],
      pass: process.env['SMTP_PASS'],
    },
  });
}

/**
 * The From address applied to all outbound emails.
 * Reads from `SMTP_FROM` env var; falls back to a safe default.
 */
export const SMTP_FROM: string = process.env['SMTP_FROM'] ?? 'no-reply@portfolio.dev';
