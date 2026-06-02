import type { Response, NextFunction } from 'express';
import { AuditLog, AuditAction } from '../database/models/AuditLog';
import { buildErrorResponse } from '../utils/response.builder';
import { ErrorCode, ErrorCodeStatus } from '../../domain/enums/error-codes.enum';
import type { AuthenticatedRequest } from './jwt.middleware';

/**
 * RBAC middleware factory.
 *
 * Checks that the authenticated user holds one of the required roles.
 * Returns 403 if the user is missing the required role.
 * Logs unauthorized access attempts to the audit log.
 *
 * @param roles  One or more allowed roles (e.g. 'ADMIN')
 *
 * @example
 * router.delete('/:id', jwtMiddleware, requireRole('ADMIN'), handler);
 */
export function requireRole(...roles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !roles.includes(req.user.role)) {
      // Audit log unauthorized access attempt when user is identified
      if (req.user) {
        await AuditLog.create({
          userId: req.user.sub,
          action: AuditAction.CREATE,
          entityType: 'UnauthorizedAccess',
          entityId: req.user.sub,
          newValues: { path: req.path, method: req.method, requiredRoles: roles },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }).catch(() => { /* swallow – do not fail request due to audit log error */ });
      }

      res
        .status(ErrorCodeStatus[ErrorCode.FORBIDDEN])
        .json(buildErrorResponse(ErrorCode.FORBIDDEN, 'Insufficient permissions'));
      return;
    }
    next();
  };
}
