import { PageHeader } from "@/components/layout/page-header";
import { DropdownManager } from "@/components/admin/dropdown-manager";
import { getAllCategories } from "@/lib/db/dropdowns";

export const dynamic = "force-dynamic";

export default async function DropdownsPage() {
  const categories = await getAllCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dropdown Lists"
        description="Manage the dropdown options used in position request forms."
      />

      <DropdownManager categories={JSON.parse(JSON.stringify(categories))} />
    </div>
  );
}
