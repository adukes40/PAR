import { NextResponse } from "next/server";
import { z } from "zod";
import { approveStep, kickBack } from "@/lib/db/approvals";

const approveSchema = z.object({
  approverId: z.string().uuid("Invalid approver ID"),
  actingAs: z.string().max(255).optional(),
});

const kickBackSchema = z.object({
  approverId: z.string().uuid("Invalid approver ID"),
  kickBackToStep: z.number().int().min(1, "Step must be at least 1"),
  reason: z.string().max(1000).optional(),
  actingAs: z.string().max(255).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === "approve") {
      const parsed = approveSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const updated = await approveStep({
        requestId: id,
        approverId: parsed.data.approverId,
        actingAs: parsed.data.actingAs,
      });
      return NextResponse.json({ data: updated });
    }

    if (action === "kick_back") {
      const parsed = kickBackSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const updated = await kickBack({
        requestId: id,
        approverId: parsed.data.approverId,
        kickBackToStep: parsed.data.kickBackToStep,
        reason: parsed.data.reason,
        actingAs: parsed.data.actingAs,
      });
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json(
      { error: "Invalid action. Must be 'approve' or 'kick_back'" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Request not found") {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      if (
        error.message.includes("not pending approval") ||
        error.message.includes("No pending approval step") ||
        error.message.includes("not the current approval step") ||
        error.message.includes("Not authorized") ||
        error.message.includes("Approver not found")
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("POST /api/requests/[id]/approve error:", error);
    return NextResponse.json(
      { error: "Failed to process approval action" },
      { status: 500 }
    );
  }
}
