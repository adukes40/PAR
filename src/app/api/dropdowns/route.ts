import { NextResponse } from "next/server";
import { getAllCategories, getActiveOptionsByCategory } from "@/lib/db/dropdowns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    if (activeOnly) {
      const options = await getActiveOptionsByCategory();
      return NextResponse.json({ data: options });
    }

    const categories = await getAllCategories();
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("GET /api/dropdowns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dropdown categories" },
      { status: 500 }
    );
  }
}
