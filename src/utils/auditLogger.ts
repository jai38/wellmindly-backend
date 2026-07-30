import prisma from '../lib/prisma';

export interface AuditLogOptions {
  actorId?: string | null;
  action: string;
  targetEntity: string;
  targetId?: string | null;
  ipAddress?: string | null;
  details?: Record<string, any> | null;
}

export function logAuditEvent(options: AuditLogOptions): void {
  // Execute asynchronously without blocking request handling thread
  prisma.auditLog
    .create({
      data: {
        actorId: options.actorId || null,
        action: options.action,
        targetEntity: options.targetEntity,
        targetId: options.targetId || null,
        ipAddress: options.ipAddress || null,
        details: options.details ? (options.details as any) : undefined,
      },
    })
    .catch((err) => {
      console.error('[AuditLogger Error] Failed to write audit log:', err);
    });
}
