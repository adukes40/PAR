import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ============================================================
  // Dropdown Categories & Options
  // ============================================================

  const positionCategory = await prisma.dropdownCategory.upsert({
    where: { name: "position" },
    update: {},
    create: {
      name: "position",
      label: "Position",
    },
  });

  const locationCategory = await prisma.dropdownCategory.upsert({
    where: { name: "location" },
    update: {},
    create: {
      name: "location",
      label: "Location",
    },
  });

  const fundLineCategory = await prisma.dropdownCategory.upsert({
    where: { name: "fund_line" },
    update: {},
    create: {
      name: "fund_line",
      label: "Fund Line(s)",
    },
  });

  // Example options (one per category — delete and replace with real data)
  const examples = [
    { category: positionCategory, label: "Example Position", value: "example_position" },
    { category: locationCategory, label: "Example Location", value: "example_location" },
    { category: fundLineCategory, label: "Example Fund Line", value: "example_fund_line" },
  ];

  for (const ex of examples) {
    await prisma.dropdownOption.upsert({
      where: {
        categoryId_value: {
          categoryId: ex.category.id,
          value: ex.value,
        },
      },
      update: {},
      create: {
        categoryId: ex.category.id,
        label: ex.label,
        value: ex.value,
        sortOrder: 0,
      },
    });
  }

  console.log("  ✓ Dropdown categories and example options seeded");

  // Example approver (delete and replace with real approvers)
  const existingApprover = await prisma.approver.findFirst();
  if (!existingApprover) {
    await prisma.approver.create({
      data: {
        name: "Example Approver",
        title: "Example Title",
        sortOrder: 1,
      },
    });
  }

  console.log("  ✓ Example approver seeded");

  // ============================================================
  // Job ID Counter
  // ============================================================

  await prisma.jobIdCounter.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      currentYear: new Date().getFullYear(),
      currentSequence: 0,
    },
  });

  console.log("  ✓ Job ID counter initialized");

  // ============================================================
  // Default Admin User
  // ============================================================

  const adminEmail = process.env.ADMIN_EMAIL || "admin@cr.k12.de.us";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD environment variable is required for seeding");
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`  ✓ Admin user created (${adminEmail})`);
    console.log("    ⚠ Change the default admin password after first login!");
  } else {
    console.log("  ✓ Admin user already exists — skipping");
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
