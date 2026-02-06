import { PageHeader } from "@/components/layout/page-header";
import { ApprovalQueue } from "@/components/approvals/approval-queue";
import { getAllApprovers } from "@/lib/db/approvers";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvers = await getAllApprovers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Review and approve position authorization requests."
      />

      <ApprovalQueue approvers={JSON.parse(JSON.stringify(approvers))} />
    </div>
  );
}
