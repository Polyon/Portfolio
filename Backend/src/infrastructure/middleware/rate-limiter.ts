import rateLimit from 'express-rate-limit';
import {
  RATE_LIMIT_AUTH,
  RATE_LIMIT_PUBLIC,
  RATE_LIMIT_AUTHENTICATED,
  RATE_LIMIT_WINDOW_MS,
} from '../constants/api.constants';
import { ErrorCode } from '../../domain/enums/error-codes.enum';

const rateLimitResponse = (errorCode: ErrorCode, message: string) =>
  (_req: unknown, res: { status: (n: number) => { json: (body: unknown) => void } }) => {
    res.status(429).json({
      error: message,
      errorCode,
      timestamp: new Date().toISOString(),
    });
  };

/**
 * Strict rate limiter for authentication endpoints.
 * 100 requests per minute per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse(ErrorCode.RATE_LIMITED, 'Too many authentication attempts. Try again later.'),
});

/**
 * Permissive rate limiter for public (unauthenticated) endpoints.
 * 1000 requests per minute per IP.
 */
export const publicRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_PUBLIC,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse(ErrorCode.RATE_LIMITED, 'Rate limit exceeded.'),
});

/**
 * Standard rate limiter for authenticated admin endpoints.
 * 500 requests per minute per IP.
 */
export const authenticatedRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_AUTHENTICATED,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse(ErrorCode.RATE_LIMITED, 'Rate limit exceeded.'),
});
