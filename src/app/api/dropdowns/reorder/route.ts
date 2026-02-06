import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderOptions } from "@/lib/db/dropdowns";

const reorderSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  optionIds: z.array(z.string().uuid("Invalid option ID")).min(1),
  changedBy: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await reorderOptions(parsed.data.categoryId, parsed.data.optionIds, parsed.data.changedBy);
    return NextResponse.json({ message: "Options reordered successfully" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not belong to category")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/dropdowns/reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder options" },
      { status: 500 }
    );
  }
}
