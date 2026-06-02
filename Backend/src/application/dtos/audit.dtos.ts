export interface AuditLogResponse {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ChangesSummary {
  entityType: string;
  entityId: string;
  changeCount: number;
  lastChanged: Date;
}
