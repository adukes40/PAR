import { NextResponse } from "next/server";
import { z } from "zod";
import { createOption } from "@/lib/db/dropdowns";
import { requireAuth } from "@/lib/auth-helpers";

const suggestOptionSchema = z.object({
  categoryId: z.string().uuid(),
  label: z.string().min(1).max(255),
});

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = suggestOptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const changedBy = session.user.name || session.user.email;
    const option = await createOption({
      categoryId: parsed.data.categoryId,
      label: parsed.data.label,
      needsReview: true,
      changedBy,
    });

    return NextResponse.json({ data: option }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Category not found") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "An option with this name already exists" },
          { status: 409 }
        );
      }
    }
    console.error("POST /api/dropdowns/options/suggest error:", error);
    return NextResponse.json(
      { error: "Failed to suggest option" },
      { status: 500 }
    );
  }
}
