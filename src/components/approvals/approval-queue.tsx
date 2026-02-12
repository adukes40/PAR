"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Approver {
  id: string;
  name: string;
  title: string;
  email: string | null;
  delegates: { id: string; delegateName: string; delegateEmail: string | null; isActive: boolean }[];
}

interface PendingRequest {
  id: string;
  jobId: string;
  submittedBy: string | null;
  submittedAt: string | null;
  createdAt: string;
  position: { label: string } | null;
  location: { label: string } | null;
  approvalSteps: {
    id: string;
    stepOrder: number;
    status: string;
    approvedBy: string | null;
    approvedAt: string | null;
    approver: { id: string; name: string; title: string };
  }[];
}

interface ApprovalDashboardProps {
  approvers: Approver[];
  pendingRequests: PendingRequest[];
  myApproverIds: string[];
}

function getCurrentStep(request: PendingRequest) {
  return request.approvalSteps
    .filter((s) => s.status === "PENDING")
    .sort((a, b) => a.stepOrder - b.stepOrder)[0] ?? null;
}

export function ApprovalDashboard({ approvers, pendingRequests, myApproverIds }: ApprovalDashboardProps) {
  const requestsWithStep = pendingRequests.map((req) => ({
    ...req,
    currentStep: getCurrentStep(req),
  }));

  // My queue: requests where the current pending step is for one of my approver IDs
  const myQueue = requestsWithStep.filter(
    (r) => r.currentStep && myApproverIds.includes(r.currentStep.approver.id)
  );

  const hasApproverRole = myApproverIds.length > 0;

  return (
    <div className="space-y-8">
      {/* My Pending Approvals */}
      {hasApproverRole && (
        <Card>
          <CardHeader>
            <CardTitle>
              Your Pending Approvals{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({myQueue.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests awaiting your approval.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myQueue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <Link href={`/requests/${item.id}`} className="text-primary hover:underline">
                          {item.jobId}
                        </Link>
                      </TableCell>
                      <TableCell>{item.position?.label ?? "—"}</TableCell>
                      <TableCell>{item.location?.label ?? "—"}</TableCell>
                      <TableCell>{item.submittedBy ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(item.submittedAt || item.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {item.currentStep?.stepOrder} of {item.approvalSteps.length}
                      </TableCell>
                      <TableCell>
                        <Link href={`/requests/${item.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval Overview — all pending requests with chain progress */}
      <Card>
        <CardHeader>
          <CardTitle>
            Approval Overview{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({requestsWithStep.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestsWithStep.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests pending approval.</p>
          ) : (
            <div className="space-y-4">
              {requestsWithStep.map((req) => (
                <div key={req.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        href={`/requests/${req.id}`}
                        className="font-medium text-primary hover:underline shrink-0"
                      >
                        {req.jobId}
                      </Link>
                      <span className="text-muted-foreground text-sm truncate">
                        {req.position?.label ?? ""}
                        {req.submittedBy ? ` — ${req.submittedBy}` : ""}
                      </span>
                    </div>
                    <Link href={`/requests/${req.id}`}>
                      <Button variant="outline" size="sm" className="shrink-0 ml-2">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </Link>
                  </div>

                  {/* Approval chain progress */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {req.approvalSteps.map((step, idx) => {
                      const isCurrent = step.id === req.currentStep?.id;
                      return (
                        <div key={step.id} className="flex items-center">
                          {idx > 0 && <div className="w-5 h-px bg-border" />}
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                              step.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300"
                                : isCurrent
                                  ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                                  : "bg-muted text-muted-foreground"
                            )}
                            title={
                              step.status === "APPROVED"
                                ? `${step.approver.name} — Approved by ${step.approvedBy}`
                                : `${step.approver.name} — ${isCurrent ? "Current" : "Waiting"}`
                            }
                          >
                            {step.status === "APPROVED" ? (
                              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                            ) : isCurrent ? (
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 shrink-0" />
                            )}
                            {step.approver.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
