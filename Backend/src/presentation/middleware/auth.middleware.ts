import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../infrastructure/auth/jwt.service';
import { UnauthorizedError, ForbiddenError } from '../../domain/errors/AppError';

export interface AuthenticatedRequest extends Request {
  user?: { sub: string; email: string; role: string };
}

/** Middleware that validates the Bearer JWT token. */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError('No authorization token provided'));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { sub: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/** Middleware factory that requires a specific role. */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }
    next();
  };
}
