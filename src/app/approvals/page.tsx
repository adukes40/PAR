import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { ApprovalDashboard } from "@/components/approvals/approval-queue";
import { getActiveApprovers } from "@/lib/db/approvers";
import { getAllPendingRequests } from "@/lib/db/approvals";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const user = session.user as { email: string; name?: string | null; role: string };

  const [approvers, pendingRequests] = await Promise.all([
    getActiveApprovers(),
    getAllPendingRequests(),
  ]);

  // Find approver IDs where the user is the primary approver or an active delegate
  const myApproverIds: string[] = [];
  for (const approver of approvers) {
    if (approver.email?.toLowerCase() === user.email.toLowerCase()) {
      myApproverIds.push(approver.id);
    } else {
      const isDelegate = approver.delegates.some(
        (d) => d.isActive && d.delegateEmail?.toLowerCase() === user.email.toLowerCase()
      );
      if (isDelegate) myApproverIds.push(approver.id);
    }
  }

  // Serialize for client component
  const serializedApprovers = JSON.parse(JSON.stringify(approvers));
  const serializedRequests = JSON.parse(JSON.stringify(pendingRequests));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Approvals"
        description="Review and track position authorization request approvals."
      />

      <ApprovalDashboard
        approvers={serializedApprovers}
        pendingRequests={serializedRequests}
        myApproverIds={myApproverIds}
      />
    </div>
  );
}
