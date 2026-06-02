import { TOKEN_EXPIRY_ACCESS, TOKEN_EXPIRY_REFRESH } from '../constants/api.constants';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type TokenPayload,
} from '../auth/jwt.service';

export type { TokenPayload };

/**
 * Generate a JWT access token valid for 24 hours.
 * @param userId  MongoDB ObjectId string
 * @param email   User's email address
 * @param role    User role (e.g. 'ADMIN')
 */
export function generateAccessToken(userId: string, email: string, role: string): string {
  return signAccessToken({ sub: userId, email, role });
}

/**
 * Generate a JWT refresh token valid for 7 days.
 * @param userId  MongoDB ObjectId string
 */
export function generateRefreshToken(userId: string, email: string, role: string): string {
  return signRefreshToken({ sub: userId, email, role });
}

/**
 * Verify an access token and return its decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 */
export function verifyToken(token: string): TokenPayload {
  return verifyAccessToken(token);
}

/**
 * Verify a refresh token and return its decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 */
export function verifyRefresh(token: string): TokenPayload {
  return verifyRefreshToken(token);
}

/**
 * Extract the raw Bearer token string from an Authorization header.
 * Returns null if the header is missing or malformed.
 *
 * @example
 * extractTokenFromHeader('Bearer eyJhbG...') // → 'eyJhbG...'
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Access token expiry in seconds (from constants). */
export const ACCESS_TOKEN_EXPIRY = TOKEN_EXPIRY_ACCESS;

/** Refresh token expiry in seconds (from constants). */
export const REFRESH_TOKEN_EXPIRY = TOKEN_EXPIRY_REFRESH;
