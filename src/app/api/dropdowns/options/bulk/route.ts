import { NextResponse } from "next/server";
import { z } from "zod";
import { createOption } from "@/lib/db/dropdowns";
import { requireHROrAdmin } from "@/lib/auth-helpers";

const bulkSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  labels: z.array(z.string().min(1).max(255)).min(1, "At least one label is required"),
});

export async function POST(request: Request) {
  const { session, error } = await requireHROrAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { categoryId, labels } = parsed.data;
    const changedBy = session.user.name || session.user.email;

    const created: string[] = [];
    const skipped: string[] = [];

    for (const label of labels) {
      try {
        await createOption({ categoryId, label, changedBy });
        created.push(label);
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          skipped.push(label);
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json({
      data: { created: created.length, skipped: skipped.length, skippedLabels: skipped },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Category not found") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    console.error("POST /api/dropdowns/options/bulk error:", error);
    return NextResponse.json(
      { error: "Failed to create options" },
      { status: 500 }
    );
  }
}
