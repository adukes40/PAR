import { NextResponse } from "next/server";
import { z } from "zod";
import { getAllApprovers, createApprover, reorderApprovers } from "@/lib/db/approvers";

const createApproverSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  title: z.string().min(1, "Title is required").max(255),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  changedBy: z.string().max(255).optional(),
});

export async function GET() {
  try {
    const approvers = await getAllApprovers();
    return NextResponse.json({ data: approvers });
  } catch (error) {
    console.error("GET /api/approvers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if this is a reorder request
    if (body.action === "reorder" && Array.isArray(body.approverIds)) {
      const reorderSchema = z.object({
        action: z.literal("reorder"),
        approverIds: z.array(z.string().uuid()).min(1),
        changedBy: z.string().max(255).optional(),
      });

      const parsed = reorderSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      await reorderApprovers(parsed.data.approverIds, parsed.data.changedBy);
      return NextResponse.json({ message: "Approvers reordered successfully" });
    }

    // Otherwise, create a new approver
    const parsed = createApproverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const approver = await createApprover(parsed.data);
    return NextResponse.json({ data: approver }, { status: 201 });
  } catch (error) {
    console.error("POST /api/approvers error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
