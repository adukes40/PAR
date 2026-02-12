import { NextResponse } from "next/server";
import { z } from "zod";
import { submitForApproval } from "@/lib/db/approvals";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const updated = await submitForApproval(id, session.user.name || session.user.email);
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Request not found") {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      if (error.message.includes("can only be submitted")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === "No active approvers configured") {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
    }
    console.error("POST /api/requests/[id]/submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
