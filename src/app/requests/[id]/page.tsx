import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/requests/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getRequestById } from "@/lib/db/requests";
import {
  REQUEST_TYPE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  POSITION_DURATION_LABELS,
  type RequestType,
  type EmploymentType,
  type PositionDuration,
} from "@/lib/constants";
import { ApprovalActions } from "@/components/requests/approval-actions";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequestById(id);

  if (!request) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Request ${request.jobId}`}
        description="Position authorization request details."
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={request.status} />
          <Link href={`/requests/${request.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Position Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailItem label="Position" value={request.position?.label} />
                <DetailItem label="Location" value={request.location?.label} />
                <DetailItem label="Fund Line(s)" value={request.fundLine?.label} />
                <DetailItem
                  label="New / Replacement"
                  value={REQUEST_TYPE_LABELS[request.requestType as RequestType]}
                />
                <DetailItem
                  label="Full or Part Time"
                  value={EMPLOYMENT_TYPE_LABELS[request.employmentType as EmploymentType]}
                />
                <DetailItem
                  label="Temporary or Regular"
                  value={POSITION_DURATION_LABELS[request.positionDuration as PositionDuration]}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hiring Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailItem label="New Employee" value={request.newEmployeeName} />
                <DetailItem
                  label="Start Date"
                  value={request.startDate ? format(new Date(request.startDate), "MMM d, yyyy") : null}
                />
                <DetailItem label="Person Being Replaced" value={request.replacedPerson} />
              </dl>
              {request.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">Notes</dt>
                    <dd className="text-sm whitespace-pre-wrap">{request.notes}</dd>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Approval Chain */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Chain</CardTitle>
            </CardHeader>
            <CardContent>
              {request.approvalSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {request.status === "DRAFT"
                    ? "Submit this request to begin the approval process."
                    : "No approval steps found."}
                </p>
              ) : (
                <div className="space-y-4">
                  {request.approvalSteps.map((step, index) => (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            step.status === "APPROVED"
                              ? "bg-emerald-600 text-white"
                              : step.status === "KICKED_BACK"
                                ? "bg-red-600 text-white"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                        {index < request.approvalSteps.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">{step.approver.name}</p>
                        <p className="text-xs text-muted-foreground">{step.approver.title}</p>
                        {step.status === "APPROVED" && step.approvedAt && (
                          <p className="text-xs text-emerald-800 font-medium mt-1">
                            Approved by {step.approvedBy} on{" "}
                            {format(new Date(step.approvedAt), "MMM d, yyyy h:mm a")}
                          </p>
                        )}
                        {step.status === "KICKED_BACK" && step.kickBackReason && (
                          <p className="text-xs text-red-700 mt-1">
                            Kicked back: {step.kickBackReason}
                          </p>
                        )}
                        {step.status === "PENDING" && (
                          <p className="text-xs text-muted-foreground mt-1">Pending</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <ApprovalActions
            requestId={request.id}
            requestStatus={request.status}
            approvalSteps={JSON.parse(JSON.stringify(request.approvalSteps))}
          />

          <Card>
            <CardHeader>
              <CardTitle>Request Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <DetailItem label="Job ID" value={request.jobId} />
                <DetailItem label="Submitted By" value={request.submittedBy} />
                <DetailItem
                  label="Created"
                  value={format(new Date(request.createdAt), "MMM d, yyyy h:mm a")}
                />
                <DetailItem
                  label="Last Updated"
                  value={format(new Date(request.updatedAt), "MMM d, yyyy h:mm a")}
                />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm mt-0.5">{value || "—"}</dd>
    </div>
  );
}
