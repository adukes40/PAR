import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { getSettings, upsertSetting } from "@/lib/db/settings";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const settings = await getSettings([
      "google_client_id",
      "google_client_secret",
      "google_service_account_key",
      "google_admin_email",
      "google_group_admins",
      "google_group_hr",
      "google_group_authorizers",
      "google_group_users",
    ]);

    return NextResponse.json({
      data: {
        google_client_id: settings.google_client_id ?? "",
        // Never expose secrets — just indicate whether they're set
        google_client_secret_set: !!settings.google_client_secret,
        google_service_account_key_set: !!settings.google_service_account_key,
        google_admin_email: settings.google_admin_email ?? "",
        google_group_admins: settings.google_group_admins ?? "",
        google_group_hr: settings.google_group_hr ?? "",
        google_group_authorizers: settings.google_group_authorizers ?? "",
        google_group_users: settings.google_group_users ?? "",
      },
    });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

const putSchema = z.object({
  google_client_id: z.string().trim().optional(),
  google_client_secret: z.string().optional(),
  google_service_account_key: z.string().optional(),
  google_admin_email: z.string().trim().optional(),
  google_group_admins: z.string().trim().optional(),
  google_group_hr: z.string().trim().optional(),
  google_group_authorizers: z.string().trim().optional(),
  google_group_users: z.string().trim().optional(),
});

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Save each provided setting
    const settingsToSave: [string, string][] = [];

    if (data.google_client_id !== undefined) {
      settingsToSave.push(["google_client_id", data.google_client_id]);
    }
    if (data.google_client_secret !== undefined && data.google_client_secret !== "") {
      settingsToSave.push(["google_client_secret", data.google_client_secret]);
    }
    if (data.google_service_account_key !== undefined && data.google_service_account_key !== "") {
      settingsToSave.push(["google_service_account_key", data.google_service_account_key]);
    }
    if (data.google_admin_email !== undefined) {
      settingsToSave.push(["google_admin_email", data.google_admin_email]);
    }
    if (data.google_group_admins !== undefined) {
      settingsToSave.push(["google_group_admins", data.google_group_admins]);
    }
    if (data.google_group_hr !== undefined) {
      settingsToSave.push(["google_group_hr", data.google_group_hr]);
    }
    if (data.google_group_authorizers !== undefined) {
      settingsToSave.push(["google_group_authorizers", data.google_group_authorizers]);
    }
    if (data.google_group_users !== undefined) {
      settingsToSave.push(["google_group_users", data.google_group_users]);
    }

    for (const [key, value] of settingsToSave) {
      await upsertSetting(key, value);
    }

    return NextResponse.json({
      data: { message: "Settings saved. Restart the container for changes to take effect." },
    });
  } catch (err) {
    console.error("PUT /api/settings error:", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
