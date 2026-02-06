import { PrismaClient } from "@prisma/client";

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

  // Position options
  const positions = [
    "General Worker 3hr",
    "General Worker 4hr",
    "General Worker 6hr",
    "Custodian",
    "Secretary",
    "Paraprofessional",
    "Teacher",
    "Nurse",
    "Bus Driver",
    "Cafeteria Worker",
  ];

  for (let i = 0; i < positions.length; i++) {
    await prisma.dropdownOption.upsert({
      where: {
        categoryId_value: {
          categoryId: positionCategory.id,
          value: positions[i].toLowerCase().replace(/\s+/g, "_"),
        },
      },
      update: { sortOrder: i },
      create: {
        categoryId: positionCategory.id,
        label: positions[i],
        value: positions[i].toLowerCase().replace(/\s+/g, "_"),
        sortOrder: i,
      },
    });
  }

  // Location options
  const locations = [
    "FMS",
    "CRHS",
    "Allen Frear Elementary",
    "W. Reily Brown Elementary",
    "Star Hill Elementary",
    "Nellie Stokes Elementary",
    "District Office",
    "Dover Air Base Middle School",
    "Simpson Elementary",
    "Postlethwait Middle School",
  ];

  for (let i = 0; i < locations.length; i++) {
    await prisma.dropdownOption.upsert({
      where: {
        categoryId_value: {
          categoryId: locationCategory.id,
          value: locations[i].toLowerCase().replace(/\s+/g, "_"),
        },
      },
      update: { sortOrder: i },
      create: {
        categoryId: locationCategory.id,
        label: locations[i],
        value: locations[i].toLowerCase().replace(/\s+/g, "_"),
        sortOrder: i,
      },
    });
  }

  // Fund Line options
  const fundLines = [
    "Child Nutrition General Fund",
    "General Fund",
    "Title I",
    "Title II",
    "IDEA",
    "State Funds",
    "Local Funds",
  ];

  for (let i = 0; i < fundLines.length; i++) {
    await prisma.dropdownOption.upsert({
      where: {
        categoryId_value: {
          categoryId: fundLineCategory.id,
          value: fundLines[i].toLowerCase().replace(/\s+/g, "_"),
        },
      },
      update: { sortOrder: i },
      create: {
        categoryId: fundLineCategory.id,
        label: fundLines[i],
        value: fundLines[i].toLowerCase().replace(/\s+/g, "_"),
        sortOrder: i,
      },
    });
  }

  console.log("  ✓ Dropdown categories and options seeded");

  // ============================================================
  // Default Approvers
  // ============================================================

  const approvers = [
    {
      name: "Roger Holt",
      title: "Director of Human Resources",
      sortOrder: 1,
    },
    {
      name: "Meaghan Brennan",
      title: "Director of Business & Finance",
      sortOrder: 2,
    },
    {
      name: "Dr. Jessilene Corbett",
      title: "Assistant Superintendent",
      sortOrder: 3,
    },
    {
      name: "Dr. Corey Miklus",
      title: "Superintendent",
      sortOrder: 4,
    },
  ];

  for (const approver of approvers) {
    const existing = await prisma.approver.findFirst({
      where: { name: approver.name },
    });

    if (!existing) {
      await prisma.approver.create({
        data: approver,
      });
    }
  }

  console.log("  ✓ Default approvers seeded");

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
