import Joi from 'joi';
import { REGEX_EMAIL, REGEX_URL, REGEX_LINKEDIN_URL, REGEX_GITHUB_URL } from '../constants/api.constants';

// ─── Primitive validators ─────────────────────────────────────────────────────

/** Returns true if value is a valid email address. */
export function isValidEmail(value: string): boolean {
  return REGEX_EMAIL.test(value);
}

/**
 * Returns true if password meets strength requirements:
 * - Min 8 characters
 * - At least 1 uppercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
export function isStrongPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

/** Returns true if value is a well-formed http/https URL. */
export function isValidUrl(value: string): boolean {
  return REGEX_URL.test(value);
}

/** Returns true if value is a valid LinkedIn profile or company URL. */
export function isValidLinkedInUrl(value: string): boolean {
  return REGEX_LINKEDIN_URL.test(value);
}

/** Returns true if value is a valid GitHub profile URL. */
export function isValidGitHubUrl(value: string): boolean {
  return REGEX_GITHUB_URL.test(value);
}

/**
 * Returns true if startDate is before or equal to endDate.
 * Both values must be parseable by `new Date()`.
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  return start <= end;
}

/** Returns true if value is a valid ISO 8601 date string. */
export function isIso8601Date(value: string): boolean {
  return !isNaN(new Date(value).getTime()) && /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(value);
}

// ─── Reusable Joi schemas ─────────────────────────────────────────────────────

export const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .lowercase()
  .trim()
  .required();

export const passwordSchema = Joi.string()
  .min(8)
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/\d/, 'digit')
  .pattern(/[^A-Za-z0-9]/, 'special character')
  .required()
  .messages({
    'string.pattern.name': 'Password must contain at least one {{#name}}',
    'string.min': 'Password must be at least 8 characters',
  });

export const urlSchema = Joi.string().uri({ scheme: ['http', 'https'] }).optional().allow('');

export const isoDateSchema = Joi.string().isoDate().optional();

export const isoDateRangeSchema = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().optional().allow(''),
}).custom((value: { startDate: string; endDate?: string }, helpers) => {
  if (value.endDate && !isValidDateRange(value.startDate, value.endDate)) {
    return helpers.error('any.invalid', { message: 'startDate must be before or equal to endDate' });
  }
  return value;
});
