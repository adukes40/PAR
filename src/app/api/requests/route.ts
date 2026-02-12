import { NextResponse } from "next/server";
import { z } from "zod";
import { listRequests, createRequest } from "@/lib/db/requests";
import { requireAuth } from "@/lib/auth-helpers";

const createRequestSchema = z.object({
  positionId: z.string().uuid().optional().or(z.literal("")),
  locationId: z.string().uuid().optional().or(z.literal("")),
  fundLineId: z.string().uuid().optional().or(z.literal("")),
  requestType: z.enum(["NEW", "REPLACEMENT"]),
  employmentType: z.enum(["FULL_TIME", "PART_TIME"]),
  positionDuration: z.enum(["TEMPORARY", "REGULAR"]),
  newEmployeeName: z.string().max(255).optional(),
  startDate: z.string().optional(),
  replacedPerson: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const result = await listRequests({ status, search, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/requests error:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const parsed = createRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Clean empty strings to undefined
    const cleaned = {
      ...parsed.data,
      positionId: parsed.data.positionId || undefined,
      locationId: parsed.data.locationId || undefined,
      fundLineId: parsed.data.fundLineId || undefined,
    };

    const par = await createRequest({ ...cleaned, submittedBy: session.user.name || session.user.email });
    return NextResponse.json({ data: par }, { status: 201 });
  } catch (error) {
    console.error("POST /api/requests error:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
