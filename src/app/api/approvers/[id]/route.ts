import { NextResponse } from "next/server";
import { z } from "zod";
import { updateApprover, deactivateApprover } from "@/lib/db/approvers";

const updateApproverSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  title: z.string().min(1).max(255).optional(),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  sortOrder: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  changedBy: z.string().max(255).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid approver ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateApproverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const approver = await updateApprover(id, parsed.data);
    return NextResponse.json({ data: approver });
  } catch (error) {
    if (error instanceof Error && error.message === "Approver not found") {
      return NextResponse.json({ error: "Approver not found" }, { status: 404 });
    }
    console.error("PATCH /api/approvers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update approver" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid approver ID" }, { status: 400 });
    }

    const approver = await deactivateApprover(id);
    return NextResponse.json({ data: approver });
  } catch (error) {
    if (error instanceof Error && error.message === "Approver not found") {
      return NextResponse.json({ error: "Approver not found" }, { status: 404 });
    }
    console.error("DELETE /api/approvers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate approver" },
      { status: 500 }
    );
  }
}
