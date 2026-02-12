import { prisma } from "@/lib/prisma";

export async function getAllUsers() {
  const [users, approvers] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        buildingId: true,
        positionId: true,
        createdAt: true,
        building: { select: { id: true, label: true } },
        position: { select: { id: true, label: true } },
      },
    }),
    prisma.approver.findMany({
      where: { isActive: true, email: { not: null } },
      select: { email: true },
    }),
  ]);

  const approverEmails = new Set(approvers.map((a) => a.email!.toLowerCase()));

  return users.map((u) => ({
    ...u,
    isApprover: approverEmails.has(u.email.toLowerCase()),
  }));
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      buildingId: true,
      positionId: true,
      createdAt: true,
      building: { select: { id: true, label: true } },
      position: { select: { id: true, label: true } },
    },
  });
}

export async function createUser(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  buildingId?: string;
  positionId?: string;
  role?: string;
}) {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || null;

  return prisma.user.create({
    data: {
      email: data.email,
      name,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      buildingId: data.buildingId || null,
      positionId: data.positionId || null,
      role: data.role || "USER",
    },
  });
}

export async function updateUser(
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    buildingId?: string | null;
    positionId?: string | null;
    role?: string;
  }
) {
  const updateData: Record<string, unknown> = {};

  if (data.firstName !== undefined) updateData.firstName = data.firstName || null;
  if (data.lastName !== undefined) updateData.lastName = data.lastName || null;
  if (data.buildingId !== undefined) updateData.buildingId = data.buildingId || null;
  if (data.positionId !== undefined) updateData.positionId = data.positionId || null;
  if (data.role !== undefined) updateData.role = data.role;

  // Update display name if name fields were provided
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const current = await prisma.user.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
    const fn = data.firstName !== undefined ? data.firstName : current?.firstName;
    const ln = data.lastName !== undefined ? data.lastName : current?.lastName;
    updateData.name = [fn, ln].filter(Boolean).join(" ") || null;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  });
}
