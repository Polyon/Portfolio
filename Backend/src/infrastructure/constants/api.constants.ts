/** Pagination defaults */
export const PAGINATION_DEFAULT_LIMIT = 10;
export const PAGINATION_MAX_LIMIT = 100;
export const PAGINATION_DEFAULT_PAGE = 1;

/** Rate limit thresholds (requests per minute) */
export const RATE_LIMIT_AUTH = 100;
export const RATE_LIMIT_PUBLIC = 1000;
export const RATE_LIMIT_AUTHENTICATED = 500;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/** Token expiry times (seconds) */
export const TOKEN_EXPIRY_ACCESS = 86400;       // 24 hours
export const TOKEN_EXPIRY_REFRESH = 604800;     // 7 days

/** Validation regex patterns */
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEX_URL = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
export const REGEX_PHONE = /^\+?[1-9]\d{1,14}$/;
export const REGEX_LINKEDIN_URL = /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+\/?$/;
export const REGEX_GITHUB_URL = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/;

/** Enum values (mirrors Mongoose enums) */
export const USER_ROLES = ['ADMIN', 'VIEWER'] as const;

export const SKILL_CATEGORIES = [
  'FRONTEND',
  'BACKEND',
  'DATABASE',
  'DEVOPS',
  'MOBILE',
  'TESTING',
  'DESIGN',
  'OTHER',
] as const;

export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'FREELANCE',
  'INTERNSHIP',
] as const;

export const PROJECT_STATUSES = [
  'IN_PROGRESS',
  'COMPLETED',
  'DEPLOYED',
  'ARCHIVED',
] as const;

export const SERVICE_CATEGORIES = [
  'WEB_DEVELOPMENT',
  'MOBILE_DEVELOPMENT',
  'API_DEVELOPMENT',
  'CONSULTING',
  'MENTORING',
  'OTHER',
] as const;

/** Max request body size */
export const MAX_BODY_SIZE = '10mb';
