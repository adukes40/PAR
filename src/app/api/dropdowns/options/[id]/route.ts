import { NextResponse } from "next/server";
import { z } from "zod";
import { updateOption, deactivateOption, reactivateOption } from "@/lib/db/dropdowns";
import { requireHROrAdmin } from "@/lib/auth-helpers";

const updateOptionSchema = z.object({
  label: z.string().min(1).max(255).optional(),
  value: z.string().min(1).max(255).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  needsReview: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireHROrAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid option ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateOptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const changedBy = session.user.name || session.user.email;
    const option = await updateOption(id, { ...parsed.data, changedBy });
    return NextResponse.json({ data: option });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Option not found") {
        return NextResponse.json({ error: "Option not found" }, { status: 404 });
      }
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "An option with this value already exists in this category" },
          { status: 409 }
        );
      }
    }
    console.error("PATCH /api/dropdowns/options/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update option" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireHROrAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;

    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid option ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const reactivate = searchParams.get("reactivate") === "true";

    if (reactivate) {
      const option = await reactivateOption(id);
      return NextResponse.json({ data: option });
    }

    const option = await deactivateOption(id);
    return NextResponse.json({ data: option });
  } catch (error) {
    if (error instanceof Error && error.message === "Option not found") {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }
    console.error("DELETE /api/dropdowns/options/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate option" },
      { status: 500 }
    );
  }
}
