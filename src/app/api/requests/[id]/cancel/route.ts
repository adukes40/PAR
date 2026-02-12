import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelRequest } from "@/lib/db/requests";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const updated = await cancelRequest(id, session.user.name || session.user.email);
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Request not found") {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      if (error.message.includes("can be cancelled")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }
    console.error("POST /api/requests/[id]/cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel request" },
      { status: 500 }
    );
  }
}
