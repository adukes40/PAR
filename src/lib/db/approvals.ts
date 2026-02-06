import { prisma } from "@/lib/prisma";
import {
  REQUEST_STATUS,
  APPROVAL_STATUS,
  AUDIT_ENTITY_TYPE,
  AUDIT_ACTION,
} from "@/lib/constants";
import { createAuditLogInTx } from "./audit";

export async function submitForApproval(requestId: string, submittedBy?: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.parRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (request.status !== REQUEST_STATUS.DRAFT && request.status !== REQUEST_STATUS.KICKED_BACK) {
      throw new Error("Request can only be submitted from DRAFT or KICKED_BACK status");
    }
    const approvers = await tx.approver.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    if (approvers.length === 0) throw new Error("No active approvers configured");
    await tx.approvalStep.deleteMany({ where: { requestId } });
    await tx.approvalStep.createMany({
      data: approvers.map((a, i) => ({ requestId, approverId: a.id, stepOrder: i + 1, status: APPROVAL_STATUS.PENDING })),
    });
    const updated = await tx.parRequest.update({
      where: { id: requestId },
      data: { status: REQUEST_STATUS.PENDING_APPROVAL, submittedBy: submittedBy?.trim() || request.submittedBy, submittedAt: new Date() },
    });
    await createAuditLogInTx(tx, {
      entityType: AUDIT_ENTITY_TYPE.PAR_REQUEST, entityId: requestId,
      action: request.status === REQUEST_STATUS.KICKED_BACK ? AUDIT_ACTION.RESUBMITTED : AUDIT_ACTION.SUBMITTED,
      changedBy: submittedBy, metadata: { approverCount: approvers.length, approverNames: approvers.map((a) => a.name) },
    });
    return updated;
  });
}

export async function getCurrentPendingStep(requestId: string) {
  return prisma.approvalStep.findFirst({
    where: { requestId, status: APPROVAL_STATUS.PENDING },
    orderBy: { stepOrder: "asc" },
    include: { approver: { include: { delegates: true } } },
  });
}

export async function approveStep(params: { requestId: string; approverId: string; actingAs?: string }) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.parRequest.findUnique({ where: { id: params.requestId } });
    if (!request) throw new Error("Request not found");
    if (request.status !== REQUEST_STATUS.PENDING_APPROVAL) throw new Error("Request is not pending approval");
    const step = await tx.approvalStep.findFirst({
      where: { requestId: params.requestId, approverId: params.approverId, status: APPROVAL_STATUS.PENDING },
      include: { approver: { include: { delegates: true } } },
    });
    if (!step) throw new Error("No pending approval step found for this approver");
    const currentPending = await tx.approvalStep.findFirst({
      where: { requestId: params.requestId, status: APPROVAL_STATUS.PENDING },
      orderBy: { stepOrder: "asc" },
    });
    if (currentPending && currentPending.id !== step.id) {
      throw new Error("This is not the current approval step");
    }
    if (params.actingAs) {
      const isValid = step.approver.delegates.some((d) => d.delegateName === params.actingAs && d.isActive);
      if (!isValid && params.actingAs !== step.approver.name) throw new Error("Not authorized to approve on behalf of this approver");
    }
    const approvedBy = params.actingAs || step.approver.name;
    await tx.approvalStep.update({ where: { id: step.id }, data: { status: APPROVAL_STATUS.APPROVED, approvedBy, approvedAt: new Date() } });
    const remainingPending = await tx.approvalStep.count({ where: { requestId: params.requestId, status: APPROVAL_STATUS.PENDING } });
    const newStatus = remainingPending === 0 ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.PENDING_APPROVAL;
    const updated = await tx.parRequest.update({ where: { id: params.requestId }, data: { status: newStatus } });
    await createAuditLogInTx(tx, {
      entityType: AUDIT_ENTITY_TYPE.APPROVAL_STEP, entityId: step.id, action: AUDIT_ACTION.APPROVED, changedBy: approvedBy,
      metadata: { requestId: params.requestId, jobId: request.jobId, stepOrder: step.stepOrder, approverName: step.approver.name, actingAs: params.actingAs || null, requestFullyApproved: remainingPending === 0 },
    });
    return updated;
  });
}

export async function kickBack(params: { requestId: string; approverId: string; kickBackToStep: number; reason?: string; actingAs?: string }) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.parRequest.findUnique({ where: { id: params.requestId } });
    if (!request) throw new Error("Request not found");
    if (request.status !== REQUEST_STATUS.PENDING_APPROVAL) throw new Error("Request is not pending approval");
    const kickerStep = await tx.approvalStep.findFirst({
      where: { requestId: params.requestId, approverId: params.approverId },
      include: { approver: { include: { delegates: true } } },
    });
    if (!kickerStep) throw new Error("Approver not found in this request's approval chain");
    if (params.actingAs) {
      const isValid = kickerStep.approver.delegates.some((d) => d.delegateName === params.actingAs && d.isActive);
      if (!isValid && params.actingAs !== kickerStep.approver.name) throw new Error("Not authorized");
    }
    const targetStep = await tx.approvalStep.findFirst({ where: { requestId: params.requestId, stepOrder: params.kickBackToStep } });
    if (!targetStep) throw new Error(`Step ${params.kickBackToStep} not found`);
    const actingName = params.actingAs || kickerStep.approver.name;
    await tx.approvalStep.updateMany({
      where: { requestId: params.requestId, stepOrder: { gte: params.kickBackToStep } },
      data: { status: APPROVAL_STATUS.PENDING, approvedBy: null, approvedAt: null, kickBackToStep: null, kickBackReason: null },
    });
    await tx.approvalStep.update({ where: { id: kickerStep.id }, data: { kickBackReason: params.reason?.trim() || null } });
    const updated = await tx.parRequest.update({ where: { id: params.requestId }, data: { status: REQUEST_STATUS.KICKED_BACK } });
    await createAuditLogInTx(tx, {
      entityType: AUDIT_ENTITY_TYPE.APPROVAL_STEP, entityId: kickerStep.id, action: AUDIT_ACTION.KICKED_BACK, changedBy: actingName,
      metadata: { requestId: params.requestId, jobId: request.jobId, kickedBackBy: actingName, kickBackToStep: params.kickBackToStep, reason: params.reason || null },
    });
    return updated;
  });
}

export async function getApprovalQueue(approverId: string) {
  const pendingSteps = await prisma.approvalStep.findMany({
    where: { approverId, status: APPROVAL_STATUS.PENDING, request: { status: REQUEST_STATUS.PENDING_APPROVAL } },
    include: { request: { include: { position: true, location: true, fundLine: true, approvalSteps: { include: { approver: true }, orderBy: { stepOrder: "asc" } } } } },
    orderBy: { request: { createdAt: "asc" } },
  });
  return pendingSteps.filter((step) => {
    const cp = step.request.approvalSteps.find((s) => s.status === APPROVAL_STATUS.PENDING);
    return cp?.id === step.id;
  });
}
