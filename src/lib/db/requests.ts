import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AUDIT_ENTITY_TYPE, AUDIT_ACTION } from "@/lib/constants";
import { createAuditLog, computeChanges } from "./audit";
import { generateJobId } from "@/lib/job-id";

// Fields that are tracked for audit purposes when updating a request
const TRACKED_FIELDS = [
  "positionId",
  "locationId",
  "fundLineId",
  "requestType",
  "employmentType",
  "positionDuration",
  "newEmployeeName",
  "startDate",
  "replacedPerson",
  "notes",
];

// Standard include for fetching a request with all relations
const requestInclude = {
  position: true,
  location: true,
  fundLine: true,
  approvalSteps: {
    include: {
      approver: {
        include: {
          delegates: true,
        },
      },
    },
    orderBy: { stepOrder: "asc" as const },
  },
};

/**
 * List all requests with optional filtering.
 */
export async function listRequests(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = params?.page ?? 1;
  const limit = Math.min(params?.limit ?? 25, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ParRequestWhereInput = {};

  if (params?.status) {
    where.status = params.status;
  }

  if (params?.search) {
    const search = params.search.trim();
    where.OR = [
      { jobId: { contains: search, mode: "insensitive" } },
      { submittedBy: { contains: search, mode: "insensitive" } },
      { newEmployeeName: { contains: search, mode: "insensitive" } },
      { replacedPerson: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.parRequest.findMany({
      where,
      include: {
        position: true,
        location: true,
        fundLine: true,
        approvalSteps: {
          include: {
            approver: true,
          },
          orderBy: { stepOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.parRequest.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single request by ID with all relations.
 */
export async function getRequestById(id: string) {
  return prisma.parRequest.findUnique({
    where: { id },
    include: requestInclude,
  });
}

/**
 * Create a new request (DRAFT status).
 */
export async function createRequest(data: {
  positionId?: string;
  locationId?: string;
  fundLineId?: string;
  requestType: string;
  employmentType: string;
  positionDuration: string;
  newEmployeeName?: string;
  startDate?: string;
  replacedPerson?: string;
  notes?: string;
  submittedBy?: string;
}) {
  const jobId = await generateJobId();

  const request = await prisma.parRequest.create({
    data: {
      jobId,
      positionId: data.positionId || null,
      locationId: data.locationId || null,
      fundLineId: data.fundLineId || null,
      requestType: data.requestType,
      employmentType: data.employmentType,
      positionDuration: data.positionDuration,
      newEmployeeName: data.newEmployeeName?.trim() || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      replacedPerson: data.replacedPerson?.trim() || null,
      notes: data.notes?.trim() || null,
      submittedBy: data.submittedBy?.trim() || null,
      status: "DRAFT",
    },
    include: requestInclude,
  });

  await createAuditLog({
    entityType: AUDIT_ENTITY_TYPE.PAR_REQUEST,
    entityId: request.id,
    action: AUDIT_ACTION.CREATED,
    changedBy: data.submittedBy,
    metadata: { jobId },
  });

  return request;
}

/**
 * Update an existing request.
 */
export async function updateRequest(
  id: string,
  data: {
    positionId?: string;
    locationId?: string;
    fundLineId?: string;
    requestType?: string;
    employmentType?: string;
    positionDuration?: string;
    newEmployeeName?: string;
    startDate?: string | null;
    replacedPerson?: string;
    notes?: string;
    changedBy?: string;
  }
) {
  const existing = await prisma.parRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Request not found");

  const updateData: Record<string, unknown> = {};
  if (data.positionId !== undefined) updateData.positionId = data.positionId || null;
  if (data.locationId !== undefined) updateData.locationId = data.locationId || null;
  if (data.fundLineId !== undefined) updateData.fundLineId = data.fundLineId || null;
  if (data.requestType !== undefined) updateData.requestType = data.requestType;
  if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
  if (data.positionDuration !== undefined) updateData.positionDuration = data.positionDuration;
  if (data.newEmployeeName !== undefined) updateData.newEmployeeName = data.newEmployeeName.trim() || null;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.replacedPerson !== undefined) updateData.replacedPerson = data.replacedPerson.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes.trim() || null;

  const updated = await prisma.parRequest.update({
    where: { id },
    data: updateData,
    include: requestInclude,
  });

  const changes = computeChanges(
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
    TRACKED_FIELDS
  );

  if (changes) {
    await createAuditLog({
      entityType: AUDIT_ENTITY_TYPE.PAR_REQUEST,
      entityId: id,
      action: AUDIT_ACTION.UPDATED,
      changedBy: data.changedBy,
      changes,
    });
  }

  return updated;
}
