import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequestForm } from "@/components/requests/request-form";
import { StatusBadge } from "@/components/requests/status-badge";
import { getRequestById } from "@/lib/db/requests";

export const dynamic = "force-dynamic";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequestById(id);

  if (!request) {
    notFound();
  }

  const initialData = {
    id: request.id,
    positionId: request.positionId,
    locationId: request.locationId,
    fundLineId: request.fundLineId,
    requestType: request.requestType,
    employmentType: request.employmentType,
    positionDuration: request.positionDuration,
    newEmployeeName: request.newEmployeeName,
    replacedPerson: request.replacedPerson,
    notes: request.notes,
    status: request.status,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Request ${request.jobId}`}
        description="Update the position authorization request details."
      >
        <StatusBadge status={request.status} />
      </PageHeader>

      {(request.status === "APPROVED" || request.status === "PENDING_APPROVAL") && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This request has approvals. Editing may require re-approval from one or more approvers.
        </div>
      )}

      <RequestForm mode="edit" initialData={initialData} />
    </div>
  );
}
