"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/requests/status-badge";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";

interface Approver {
  id: string;
  name: string;
  title: string;
  isActive: boolean;
  delegates: { id: string; delegateName: string; isActive: boolean }[];
}

interface QueueItem {
  id: string;
  stepOrder: number;
  request: {
    id: string;
    jobId: string;
    status: string;
    createdAt: string;
    submittedBy: string | null;
    position: { label: string } | null;
    location: { label: string } | null;
    fundLine: { label: string } | null;
    approvalSteps: {
      id: string;
      stepOrder: number;
      status: string;
      approver: { name: string };
    }[];
  };
}

interface ApprovalQueueProps {
  approvers: Approver[];
}

const EMPTY_SELECT_VALUE = "__none__";

export function ApprovalQueue({ approvers }: ApprovalQueueProps) {
  const [selectedApprover, setSelectedApprover] = useState(EMPTY_SELECT_VALUE);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const activeApprovers = approvers.filter((a) => a.isActive);

  const fetchQueue = useCallback(async (approverId: string) => {
    if (approverId === EMPTY_SELECT_VALUE) {
      setQueue([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals/queue?approverId=${approverId}`);
      const data = await res.json();
      if (data.data) setQueue(data.data);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue(selectedApprover);
  }, [selectedApprover, fetchQueue]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Who are you?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-2">
            <Label>Select your approver identity</Label>
            <Select value={selectedApprover} onValueChange={setSelectedApprover}>
              <SelectTrigger>
                <SelectValue placeholder="Select an approver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>-- Select --</SelectItem>
                {activeApprovers.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedApprover !== EMPTY_SELECT_VALUE && (() => {
              const approver = activeApprovers.find((a) => a.id === selectedApprover);
              const activeDelegates = approver?.delegates.filter((d) => d.isActive) ?? [];
              if (activeDelegates.length === 0) return null;
              return (
                <p className="text-xs text-muted-foreground">
                  Delegates: {activeDelegates.map((d) => d.delegateName).join(", ")}
                </p>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {selectedApprover !== EMPTY_SELECT_VALUE && (
        <Card>
          <CardHeader>
            <CardTitle>
              Pending Approvals {!loading && `(${queue.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : queue.length === 0 ? (
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
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.request.jobId}</TableCell>
                      <TableCell>{item.request.position?.label ?? "—"}</TableCell>
                      <TableCell>{item.request.location?.label ?? "—"}</TableCell>
                      <TableCell>{item.request.submittedBy ?? "—"}</TableCell>
                      <TableCell>{format(new Date(item.request.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {item.stepOrder} of {item.request.approvalSteps.length}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.request.status} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/requests/${item.request.id}`}>
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
    </div>
  );
}
