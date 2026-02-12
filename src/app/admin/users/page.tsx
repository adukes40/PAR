import { PageHeader } from "@/components/layout/page-header";
import { UserManager } from "@/components/admin/user-manager";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and profile information."
      />

      <UserManager />
    </div>
  );
}
