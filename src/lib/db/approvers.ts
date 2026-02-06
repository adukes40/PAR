import { prisma } from "@/lib/prisma";
import { AUDIT_ENTITY_TYPE, AUDIT_ACTION } from "@/lib/constants";
import { createAuditLog, computeChanges } from "./audit";

/**
 * Get all approvers with delegates, ordered by sort order.
 */
export async function getAllApprovers() {
  return prisma.approver.findMany({
    include: {
      delegates: {
        orderBy: { delegateName: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Get only active approvers with active delegates.
 */
export async function getActiveApprovers() {
  return prisma.approver.findMany({
    where: { isActive: true },
    include: {
      delegates: {
        where: { isActive: true },
        orderBy: { delegateName: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Create a new approver.
 */
export async function createApprover(data: {
  name: string;
  title: string;
  email?: string;
  changedBy?: string;
}) {
  // Get max sort order
  const maxSort = await prisma.approver.aggregate({
    _max: { sortOrder: true },
  });

  const approver = await prisma.approver.create({
    data: {
      name: data.name.trim(),
      title: data.title.trim(),
      email: data.email?.trim() || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
    include: { delegates: true },
  });

  await createAuditLog({
    entityType: AUDIT_ENTITY_TYPE.APPROVER,
    entityId: approver.id,
    action: AUDIT_ACTION.CREATED,
    changedBy: data.changedBy,
    metadata: { name: approver.name, title: approver.title },
  });

  return approver;
}

/**
 * Update an approver's details.
 */
export async function updateApprover(
  id: string,
  data: {
    name?: string;
    title?: string;
    email?: string;
    sortOrder?: number;
    isActive?: boolean;
    changedBy?: string;
  }
) {
  const existing = await prisma.approver.findUnique({ where: { id } });
  if (!existing) throw new Error("Approver not found");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.email !== undefined) updateData.email = data.email.trim() || null;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.approver.update({
    where: { id },
    data: updateData,
    include: { delegates: true },
  });

  const changes = computeChanges(
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
    ["name", "title", "email", "sortOrder", "isActive"]
  );

  if (changes) {
    await createAuditLog({
      entityType: AUDIT_ENTITY_TYPE.APPROVER,
      entityId: id,
      action: data.isActive === false ? AUDIT_ACTION.DELETED : AUDIT_ACTION.UPDATED,
      changedBy: data.changedBy,
      changes,
    });
  }

  return updated;
}

/**
 * Soft-delete an approver.
 */
export async function deactivateApprover(id: string, changedBy?: string) {
  return updateApprover(id, { isActive: false, changedBy });
}

/**
 * Reorder approvers. Expects an array of approver IDs in desired order.
 */
export async function reorderApprovers(approverIds: string[], changedBy?: string) {
  const approvers = await prisma.approver.findMany();
  const validIds = new Set(approvers.map((a) => a.id));

  for (const id of approverIds) {
    if (!validIds.has(id)) {
      throw new Error(`Approver ${id} not found`);
    }
  }

  await prisma.$transaction(
    approverIds.map((id, index) =>
      prisma.approver.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    )
  );

  await createAuditLog({
    entityType: AUDIT_ENTITY_TYPE.APPROVER,
    entityId: "reorder",
    action: AUDIT_ACTION.UPDATED,
    changedBy,
    metadata: { action: "reorder", newOrder: approverIds },
  });
}

/**
 * Add a delegate to an approver.
 */
export async function addDelegate(data: {
  approverId: string;
  delegateName: string;
  delegateEmail?: string;
  changedBy?: string;
}) {
  const approver = await prisma.approver.findUnique({ where: { id: data.approverId } });
  if (!approver) throw new Error("Approver not found");

  const delegate = await prisma.approverDelegate.create({
    data: {
      approverId: data.approverId,
      delegateName: data.delegateName.trim(),
      delegateEmail: data.delegateEmail?.trim() || null,
    },
  });

  await createAuditLog({
    entityType: AUDIT_ENTITY_TYPE.APPROVER_DELEGATE,
    entityId: delegate.id,
    action: AUDIT_ACTION.CREATED,
    changedBy: data.changedBy,
    metadata: {
      approverId: data.approverId,
      approverName: approver.name,
      delegateName: delegate.delegateName,
    },
  });

  return delegate;
}

/**
 * Remove a delegate (hard delete since delegates have no referential constraints on requests).
 */
export async function removeDelegate(delegateId: string, changedBy?: string) {
  const delegate = await prisma.approverDelegate.findUnique({
    where: { id: delegateId },
    include: { approver: true },
  });

  if (!delegate) throw new Error("Delegate not found");

  await prisma.approverDelegate.delete({ where: { id: delegateId } });

  await createAuditLog({
    entityType: AUDIT_ENTITY_TYPE.APPROVER_DELEGATE,
    entityId: delegateId,
    action: AUDIT_ACTION.DELETED,
    changedBy,
    metadata: {
      approverName: delegate.approver.name,
      delegateName: delegate.delegateName,
    },
  });
}
