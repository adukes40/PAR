import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHROrAdmin, requireAdmin } from "@/lib/auth-helpers";
import { getUserById, updateUser } from "@/lib/db/users";
import { createApprover } from "@/lib/db/approvers";
import { createAuditLog, computeChanges } from "@/lib/db/audit";
import { AUDIT_ENTITY_TYPE, AUDIT_ACTION } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { removeMemberFromGroup, addMemberToGroup, getGroupEmailForRole } from "@/lib/google-admin";
import type { UserRole } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireHROrAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ data: user });
  } catch (err) {
    console.error("GET /api/users/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  buildingId: z.string().uuid().optional().nullable().or(z.literal("")),
  positionId: z.string().uuid().optional().nullable().or(z.literal("")),
  role: z.enum(["ADMIN", "HR", "AUTHORIZER", "USER"]).optional(),
  makeApprover: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireHROrAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const existing = await getUserById(id);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const resolvedPositionId = parsed.data.positionId === "" ? null : parsed.data.positionId;

    const updated = await updateUser(id, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      buildingId: parsed.data.buildingId === "" ? null : parsed.data.buildingId,
      positionId: resolvedPositionId,
      role: parsed.data.role,
    });

    const changes = computeChanges(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ["firstName", "lastName", "buildingId", "positionId", "role"]
    );

    if (changes) {
      await createAuditLog({
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: id,
        action: AUDIT_ACTION.UPDATED,
        changedBy: session.user.email,
        changes,
      });
    }

    // Handle Google Group change when role changes
    if (parsed.data.role && parsed.data.role !== existing.role) {
      const oldGroupEmail = await getGroupEmailForRole(existing.role as UserRole);
      const newGroupEmail = await getGroupEmailForRole(parsed.data.role as UserRole);
      if (oldGroupEmail !== newGroupEmail) {
        await removeMemberFromGroup(existing.email, oldGroupEmail);
        await addMemberToGroup(existing.email, newGroupEmail);
      }
    }

    // Handle approver toggle
    if (parsed.data.makeApprover !== undefined) {
      const existingApprover = await prisma.approver.findFirst({
        where: { email: existing.email, isActive: true },
      });

      if (parsed.data.makeApprover && !existingApprover) {
        // Add to approval chain
        const displayName = [
          parsed.data.firstName ?? existing.firstName,
          parsed.data.lastName ?? existing.lastName,
        ].filter(Boolean).join(" ") || existing.email;

        let approverTitle = parsed.data.role ?? existing.role;
        const pid = resolvedPositionId ?? existing.positionId;
        if (pid) {
          const position = await prisma.dropdownOption.findUnique({
            where: { id: pid },
            select: { label: true },
          });
          if (position) approverTitle = position.label;
        }

        const changedBy = session.user.name || session.user.email;
        const approver = await createApprover({
          name: displayName,
          title: approverTitle,
          email: existing.email,
          changedBy,
        });

        await createAuditLog({
          entityType: AUDIT_ENTITY_TYPE.APPROVER,
          entityId: approver.id,
          action: AUDIT_ACTION.CREATED,
          changedBy: session.user.email,
          metadata: { name: displayName, title: approverTitle, email: existing.email },
        });
      } else if (!parsed.data.makeApprover && existingApprover) {
        // Remove from approval chain (soft-delete)
        await prisma.approver.update({
          where: { id: existingApprover.id },
          data: { isActive: false },
        });

        await createAuditLog({
          entityType: AUDIT_ENTITY_TYPE.APPROVER,
          entityId: existingApprover.id,
          action: AUDIT_ACTION.DELETED,
          changedBy: session.user.email,
          metadata: { email: existing.email },
        });
      }
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("PATCH /api/users/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const existing = await getUserById(id);
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting yourself
    if (existing.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    // Remove from Google Group (best-effort)
    const groupEmail = await getGroupEmailForRole(existing.role as UserRole);
    await removeMemberFromGroup(existing.email, groupEmail);

    // Deactivate approver record if one exists
    const existingApprover = await prisma.approver.findFirst({
      where: { email: existing.email, isActive: true },
    });
    if (existingApprover) {
      await prisma.approver.update({
        where: { id: existingApprover.id },
        data: { isActive: false },
      });

      await createAuditLog({
        entityType: AUDIT_ENTITY_TYPE.APPROVER,
        entityId: existingApprover.id,
        action: AUDIT_ACTION.DELETED,
        changedBy: session.user.email,
        metadata: { email: existing.email },
      });
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: id,
      action: AUDIT_ACTION.DELETED,
      changedBy: session.user.email,
      metadata: { email: existing.email, name: existing.name },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("DELETE /api/users/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
