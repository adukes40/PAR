import { NextResponse } from "next/server";
import { z } from "zod";
import { addDelegate, removeDelegate } from "@/lib/db/approvers";

const addDelegateSchema = z.object({
  delegateName: z.string().min(1, "Name is required").max(255),
  delegateEmail: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  changedBy: z.string().max(255).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid approver ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = addDelegateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const delegate = await addDelegate({
      approverId: id,
      ...parsed.data,
    });

    return NextResponse.json({ data: delegate }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Approver not found") {
        return NextResponse.json({ error: "Approver not found" }, { status: 404 });
      }
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "This delegate already exists for this approver" },
          { status: 409 }
        );
      }
    }
    console.error("POST /api/approvers/[id]/delegates error:", error);
    return NextResponse.json(
      { error: "Failed to add delegate" },
      { status: 500 }
    );
  }
}

const deleteDelegateSchema = z.object({
  delegateId: z.string().uuid("Invalid delegate ID"),
  changedBy: z.string().max(255).optional(),
});

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = deleteDelegateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await removeDelegate(parsed.data.delegateId, parsed.data.changedBy);
    return NextResponse.json({ message: "Delegate removed" });
  } catch (error) {
    if (error instanceof Error && error.message === "Delegate not found") {
      return NextResponse.json({ error: "Delegate not found" }, { status: 404 });
    }
    console.error("DELETE /api/approvers/[id]/delegates error:", error);
    return NextResponse.json(
      { error: "Failed to remove delegate" },
      { status: 500 }
    );
  }
}
