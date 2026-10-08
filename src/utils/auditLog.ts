import { prisma } from '../config/prisma.js';

/** Writes an AuditLog row. Accepts a transaction client so it commits atomically with the change it records. */
export async function writeAuditLog(
  tx: any,
  params: { userId: string; action: string; entity: string; entityId: string; details?: any; ipAddress?: string; userAgent?: string }
) {
  await tx.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details ?? undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
