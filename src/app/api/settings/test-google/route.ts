import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { testGoogleConnection } from "@/lib/google-admin";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const result = await testGoogleConnection();
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("POST /api/settings/test-google error:", err);
    return NextResponse.json(
      { data: { success: false, message: "Unexpected error during connection test." } },
      { status: 500 }
    );
  }
}
