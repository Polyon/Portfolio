import { AuditLog } from '../infrastructure/database/models/AuditLog';
import type { IAuditLog } from '../infrastructure/database/models/index';

export class AuditLogService {
  /** Retrieve paginated audit logs for a user. */
  async getLogs(
    userId: string,
    opts: { entityType?: string; limit?: number; skip?: number } = {}
  ): Promise<IAuditLog[]> {
    const query: Record<string, unknown> = { userId };
    if (opts.entityType) query['entityType'] = opts.entityType;

    return AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(opts.skip ?? 0)
      .limit(opts.limit ?? 50);
  }
}
