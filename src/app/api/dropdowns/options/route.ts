import { NextResponse } from "next/server";
import { z } from "zod";
import { createOption } from "@/lib/db/dropdowns";

const createOptionSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  label: z.string().min(1, "Label is required").max(255),
  value: z.string().max(255).optional(),
  changedBy: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createOptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const option = await createOption(parsed.data);
    return NextResponse.json({ data: option }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "An option with this value already exists in this category" },
          { status: 409 }
        );
      }
      if (error.message === "Category not found") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }
    console.error("POST /api/dropdowns/options error:", error);
    return NextResponse.json(
      { error: "Failed to create option" },
      { status: 500 }
    );
  }
}
