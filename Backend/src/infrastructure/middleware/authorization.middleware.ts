import type { Response, NextFunction } from 'express';
import { AuditLog, AuditAction } from '../database/models/AuditLog';
import type { AuthenticatedRequest } from '../../presentation/middleware/auth.middleware';
import { ForbiddenError } from '../../domain/errors/AppError';

/**
 * Middleware factory that enforces role-based access control.
 * Logs unauthorized attempts to the audit trail.
 */
export function requireRole(...roles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !roles.includes(req.user.role)) {
      // Log unauthorized attempt
      if (req.user) {
        await AuditLog.create({
          userId: req.user.sub,
          action: AuditAction.CREATE,
          entityType: 'UnauthorizedAccess',
          entityId: req.user.sub,
          newValues: { path: req.path, method: req.method, requiredRoles: roles },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }).catch(() => {
          // swallow - do not fail request due to logging error
        });
      }
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }
    next();
  };
}
