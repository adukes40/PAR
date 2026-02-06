import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { AuditEntityType, AuditAction } from "@/lib/constants";

/**
 * Computes a field-level diff between two objects.
 * Returns a record of { field: { old, new } } for all changed fields.
 * Only includes fields that actually changed.
 */
export function computeChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack?: string[]
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  const fields = fieldsToTrack ?? Object.keys(newObj);

  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];

    // Handle Date comparison
    const oldComparable = oldVal instanceof Date ? oldVal.toISOString() : oldVal;
    const newComparable = newVal instanceof Date ? newVal.toISOString() : newVal;

    if (JSON.stringify(oldComparable) !== JSON.stringify(newComparable)) {
      changes[field] = { old: oldComparable ?? null, new: newComparable ?? null };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Creates an audit log entry.
 */
export async function createAuditLog(params: {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changedBy?: string;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changedBy: params.changedBy ?? null,
      changes: (params.changes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
}

/**
 * Creates an audit log entry within an existing transaction.
 */
export async function createAuditLogInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    changedBy?: string;
    changes?: Record<string, { old: unknown; new: unknown }> | null;
    metadata?: Record<string, unknown>;
  }
) {
  return tx.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changedBy: params.changedBy ?? null,
      changes: (params.changes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
}

/**
 * Fetches audit log entries with optional filters.
 */
export async function getAuditLogs(params?: {
  entityType?: string;
  entityId?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const page = params?.page ?? 1;
  const limit = Math.min(params?.limit ?? 50, 100); // cap at 100
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params?.entityType) where.entityType = params.entityType;
  if (params?.entityId) where.entityId = params.entityId;
  if (params?.action) where.action = params.action;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
