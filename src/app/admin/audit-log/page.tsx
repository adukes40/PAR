import { PageHeader } from "@/components/layout/page-header";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";

export const dynamic = "force-dynamic";

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="View the complete history of all changes and actions."
      />

      <AuditLogViewer />
    </div>
  );
}
