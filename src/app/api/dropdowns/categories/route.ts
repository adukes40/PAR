import { NextResponse } from "next/server";
import { z } from "zod";
import { createCategory } from "@/lib/db/dropdowns";

const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .regex(/^[a-z0-9_]+$/, "Name must be lowercase alphanumeric with underscores"),
  label: z.string().min(1, "Label is required").max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const category = await createCategory(parsed.data);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }
    console.error("POST /api/dropdowns/categories error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
