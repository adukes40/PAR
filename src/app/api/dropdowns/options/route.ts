import { NextResponse } from "next/server";
import { z } from "zod";
import { createOption } from "@/lib/db/dropdowns";
import { requireHROrAdmin } from "@/lib/auth-helpers";

const createOptionSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  label: z.string().min(1, "Label is required").max(255),
  value: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  const { session, error } = await requireHROrAdmin();
  if (error) return error;

  let validatedData: z.infer<typeof createOptionSchema> | null = null;

  try {
    const body = await request.json();
    const parsed = createOptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    validatedData = parsed.data;
    const changedBy = session.user.name || session.user.email;
    const option = await createOption({ ...parsed.data, changedBy });
    return NextResponse.json({ data: option }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint") && validatedData) {
        // Check if the conflict is with an inactive option
        const { prisma } = await import("@/lib/prisma");
        const slug = validatedData.label
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");
        const existing = await prisma.dropdownOption.findFirst({
          where: {
            categoryId: validatedData.categoryId,
            value: slug,
            isActive: false,
          },
        });
        if (existing) {
          return NextResponse.json(
            {
              error: "An option with this value already exists but is deactivated",
              code: "INACTIVE_DUPLICATE",
              inactiveOption: { id: existing.id, label: existing.label },
            },
            { status: 409 }
          );
        }
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
