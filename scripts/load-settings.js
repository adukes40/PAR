// Reads Google OAuth and Workspace settings from DB and outputs shell export statements.
// Called by entrypoint.sh before starting the app.
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.appSetting.findMany({
      where: {
        key: {
          in: [
            "google_client_id",
            "google_client_secret",
            "google_service_account_key",
            "google_admin_email",
          ],
        },
      },
    });
    for (const r of rows) {
      if (r.value) {
        if (r.key === "google_client_id") {
          console.log("export GOOGLE_CLIENT_ID=" + JSON.stringify(r.value));
        }
        if (r.key === "google_client_secret") {
          console.log("export GOOGLE_CLIENT_SECRET=" + JSON.stringify(r.value));
        }
        // google_service_account_key and google_admin_email are read from DB at runtime
        // (not via env vars) so we don't export them here
      }
    }
  } catch {
    // Table may not exist yet on first run before migrations
  } finally {
    await prisma.$disconnect();
  }
}

main();
