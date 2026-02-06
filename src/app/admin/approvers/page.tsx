import { PageHeader } from "@/components/layout/page-header";
import { ApproverManager } from "@/components/admin/approver-manager";
import { getAllApprovers } from "@/lib/db/approvers";

export const dynamic = "force-dynamic";

export default async function ApproversPage() {
  const approvers = await getAllApprovers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Chain"
        description="Configure approvers, their order, and delegate permissions."
      />

      <ApproverManager approvers={JSON.parse(JSON.stringify(approvers))} />
    </div>
  );
}
