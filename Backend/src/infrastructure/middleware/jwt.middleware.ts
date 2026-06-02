import type { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken } from '../utils/jwt.utils';
import { buildErrorResponse } from '../utils/response.builder';
import { ErrorCode, ErrorCodeStatus } from '../../domain/enums/error-codes.enum';

export interface AuthenticatedRequest extends Request {
  user?: { sub: string; email: string; role: string };
}

/**
 * JWT authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and attaches the decoded payload to `req.user`.
 *
 * Returns 401 if the token is missing, malformed, or expired.
 */
export function jwtMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractTokenFromHeader(req.headers['authorization']);

  if (!token) {
    res
      .status(ErrorCodeStatus[ErrorCode.UNAUTHORIZED])
      .json(buildErrorResponse(ErrorCode.UNAUTHORIZED, 'Authentication token is required'));
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { sub: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    res
      .status(ErrorCodeStatus[ErrorCode.UNAUTHORIZED])
      .json(buildErrorResponse(ErrorCode.UNAUTHORIZED, 'Invalid or expired token'));
  }
}
