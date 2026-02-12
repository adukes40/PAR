import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { RequestList } from "@/components/requests/request-list";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listRequests } from "@/lib/db/requests";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = session.user as { email: string; name?: string | null; role: string };
  const isAdminOrHR = user.role === "ADMIN" || user.role === "HR";

  const result = await listRequests({ limit: 5000 });

  let requests = result.data.map((r) => ({
    id: r.id,
    jobId: r.jobId,
    position: r.position ? { label: r.position.label } : null,
    location: r.location ? { label: r.location.label } : null,
    requestType: r.requestType,
    status: r.status,
    submittedBy: r.submittedBy,
    createdAt: r.createdAt.toISOString(),
  }));

  // Regular users only see their own requests
  if (!isAdminOrHR) {
    requests = requests.filter(
      (r) => r.submittedBy === user.name || r.submittedBy === user.email
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Position Authorization Requests"
        description="View and manage all position authorization requests."
      >
        <Link href="/requests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </PageHeader>

      <RequestList requests={requests} />
    </div>
  );
}
