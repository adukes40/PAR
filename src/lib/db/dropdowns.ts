import { prisma } from "@/lib/prisma";
import { AUDIT_ENTITY_TYPE, AUDIT_ACTION } from "@/lib/constants";
import { createAuditLog, computeChanges } from "./audit";

/**
 * Get all dropdown categories with their options (including inactive).
 */
export async function getAllCategories() {
  return prisma.dropdownCategory.findMany({
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Get a single dropdown category by name with active options only.
 */
export async function getCategoryByName(name: string) {
  return prisma.dropdownCategory.findUnique({
    where: { name },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/**
 * Get all active options across all categories (for form dropdowns).
 */
export async function getActiveOptionsByCategory() {
  const categories = await prisma.dropdownCategory.findMany({
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const result: Record<string, { id: string; categoryId: string; label: string; value: string; needsReview: boolean }[]> = {};
  for (const cat of categories) {
    result[cat.name] = cat.options.map((o) => ({
      id: o.id,
      categoryId: cat.id,
      label: o.label,
      value: o.value,
      needsReview: o.needsReview,
    }));
  }
  return result;
}

/**
 * Create a new dropdown category.
 */
export async function createCategory(data: { name: string; label: string }) {
  const sanitizedName = data.name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (!sanitizedName) {
    throw new Error("Category name must contain at least one alphanumeric character");
  }

  const category = await prisma.dropdownCategory.create({
    data: {
      name: sanitizedName,
      label: data.label.trim(),
    },
  });

  await createAuditLog({
    entityType: AUDIT_ENTITY_TYPE.DROPDOWN_CATEGORY,
    entityId: category.id,
    action: AUDIT_ACTION.CREATED,
    metadata: { name: sanitizedName, label: data.label.trim() },
  });

  return category;
}

/**
 * Create a new dropdown option within a category.
 */
export async function createOption(data: {
  categoryId: string;
  label: string;
  value?: string;
  needsReview?: boolean;
  changedBy?: string;
}) {
  const category = await prisma.dropdownCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  const value =
    data.value?.trim() ||
    data.label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

  if (!value) {
    throw new Error("Option value must contain at least one alphanumeric character");
  }

  const maxSort = await prisma.dropdownOption.aggregate({
    where: { categoryId: data.categoryId },
    _max: { sortOrder: true },
  });

  const option = await prisma.dropdownOption.create({
    data: {
      categoryId: data.categoryId,
      label: data.label.trim(),
      value,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      needsReview: data.needsReview ?? false,
    },
  });

  await createAuditLog({
    entityType: AUDIT_ENTITY_TYPE.DROPDOWN_OPTION,
    entityId: option.id,
    action: AUDIT_ACTION.CREATED,
    changedBy: data.changedBy,
    metadata: { categoryName: category.name, label: option.label, value: option.value },
  });

  return option;
}

/**
 * Update a dropdown option.
 */
export async function updateOption(
  id: string,
  data: {
    label?: string;
    value?: string;
    sortOrder?: number;
    isActive?: boolean;
    needsReview?: boolean;
    changedBy?: string;
  }
) {
  const existing = await prisma.dropdownOption.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Option not found");
  }

  const updateData: Record<string, unknown> = {};
  if (data.label !== undefined) updateData.label = data.label.trim();
  if (data.value !== undefined) updateData.value = data.value.trim();
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.needsReview !== undefined) updateData.needsReview = data.needsReview;

  const updated = await prisma.dropdownOption.update({
    where: { id },
    data: updateData,
  });

  const changes = computeChanges(
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
    ["label", "value", "sortOrder", "isActive", "needsReview"]
  );

  if (changes) {
    await createAuditLog({
      entityType: AUDIT_ENTITY_TYPE.DROPDOWN_OPTION,
      entityId: id,
      action: data.isActive === false ? AUDIT_ACTION.DELETED : AUDIT_ACTION.UPDATED,
      changedBy: data.changedBy,
      changes,
    });
  }

  return updated;
}

/**
 * Soft-delete a dropdown option.
 */
export async function deactivateOption(id: string, changedBy?: string) {
  return updateOption(id, { isActive: false, changedBy });
}

/**
 * Reactivate a dropdown option.
 */
export async function reactivateOption(id: string, changedBy?: string) {
  return updateOption(id, { isActive: true, changedBy });
}

/**
 * Reorder options within a category.
 */
export async function reorderOptions(
  categoryId: string,
  optionIds: string[],
  changedBy?: string
) {
  const options = await prisma.dropdownOption.findMany({
    where: { categoryId },
  });

  const validIds = new Set(options.map((o) => o.id));
  for (const id of optionIds) {
    if (!validIds.has(id)) {
      throw new Error(`Option ${id} does not belong to category ${categoryId}`);
    }
  }

  await prisma.$transaction(
    optionIds.map((id, index) =>
      prisma.dropdownOption.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  await createAuditLog({
    entityType: AUDIT_ENTITY_TYPE.DROPDOWN_CATEGORY,
    entityId: categoryId,
    action: AUDIT_ACTION.UPDATED,
    changedBy,
    metadata: { action: "reorder", newOrder: optionIds },
  });
}
