import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestById, updateRequest } from "@/lib/db/requests";

const updateRequestSchema = z.object({
  positionId: z.string().uuid().optional().or(z.literal("")),
  locationId: z.string().uuid().optional().or(z.literal("")),
  fundLineId: z.string().uuid().optional().or(z.literal("")),
  requestType: z.enum(["NEW", "REPLACEMENT"]).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME"]).optional(),
  positionDuration: z.enum(["TEMPORARY", "REGULAR"]).optional(),
  newEmployeeName: z.string().max(255).optional(),
  startDate: z.string().nullable().optional(),
  replacedPerson: z.string().max(255).optional(),
  notes: z.string().optional(),
  changedBy: z.string().max(255).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const par = await getRequestById(id);
    if (!par) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ data: par });
  } catch (error) {
    console.error("GET /api/requests/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const par = await updateRequest(id, parsed.data);
    return NextResponse.json({ data: par });
  } catch (error) {
    if (error instanceof Error && error.message === "Request not found") {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    console.error("PATCH /api/requests/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}
