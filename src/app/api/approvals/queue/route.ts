import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApprovalQueue } from "@/lib/db/approvals";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approverId = searchParams.get("approverId");

    if (!approverId || !z.string().uuid().safeParse(approverId).success) {
      return NextResponse.json({ error: "Valid approverId is required" }, { status: 400 });
    }

    const queue = await getApprovalQueue(approverId);
    return NextResponse.json({ data: queue });
  } catch (error) {
    console.error("GET /api/approvals/queue error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval queue" },
      { status: 500 }
    );
  }
}
