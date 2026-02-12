import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHROrAdmin } from "@/lib/auth-helpers";
import { getAllUsers, createUser } from "@/lib/db/users";
import { createApprover } from "@/lib/db/approvers";
import { createAuditLog } from "@/lib/db/audit";
import { AUDIT_ENTITY_TYPE, AUDIT_ACTION, USER_ROLE } from "@/lib/constants";
import { addMemberToGroup, getGroupEmailForRole } from "@/lib/google-admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireHROrAdmin();
  if (error) return error;

  try {
    const users = await getAllUsers();
    return NextResponse.json({ data: users });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  email: z.string().email().trim(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  buildingId: z.string().uuid().optional().or(z.literal("")),
  positionId: z.string().uuid().optional().or(z.literal("")),
  role: z.enum([USER_ROLE.ADMIN, USER_ROLE.HR, USER_ROLE.AUTHORIZER, USER_ROLE.USER]).optional(),
  makeApprover: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { session, error } = await requireHROrAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, buildingId, positionId, role, makeApprover } = parsed.data;
    const assignedRole = role || "USER";
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || email;

    // Look up position label for approver title
    let approverTitle: string = assignedRole;
    if (makeApprover && positionId && positionId !== "") {
      const position = await prisma.dropdownOption.findUnique({
        where: { id: positionId },
        select: { label: true },
      });
      if (position) approverTitle = position.label;
    }

    const user = await createUser({
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      buildingId: buildingId || undefined,
      positionId: positionId || undefined,
      role: assignedRole,
    });

    // Add user to the Google Group matching their role (best-effort)
    const groupEmail = await getGroupEmailForRole(assignedRole);
    await addMemberToGroup(email, groupEmail);

    // Create approver record if requested
    if (makeApprover) {
      const changedBy = session.user.name || session.user.email;
      const approver = await createApprover({
        name: displayName,
        title: approverTitle,
        email,
        changedBy,
      });

      await createAuditLog({
        entityType: AUDIT_ENTITY_TYPE.APPROVER,
        entityId: approver.id,
        action: AUDIT_ACTION.CREATED,
        changedBy: session.user.email,
        metadata: { name: displayName, title: approverTitle, email },
      });
    }

    await createAuditLog({
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: user.id,
      action: AUDIT_ACTION.CREATED,
      changedBy: session.user.email,
      metadata: { email, firstName, lastName, role: assignedRole, makeApprover: !!makeApprover },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err: unknown) {
    // Handle unique constraint violation (duplicate email)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }
    console.error("POST /api/users error:", err);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
