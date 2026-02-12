import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [drafts, pending, approved, kickedBack, recentActivity] = await Promise.all([
    prisma.parRequest.count({ where: { status: "DRAFT" } }),
    prisma.parRequest.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.parRequest.count({
      where: {
        status: "APPROVED",
        updatedAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.parRequest.count({ where: { status: "KICKED_BACK" } }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        entityType: true,
        action: true,
        changedBy: true,
        createdAt: true,
      },
    }),
  ]);

  return { drafts, pending, approved, kickedBack, recentActivity };
}
