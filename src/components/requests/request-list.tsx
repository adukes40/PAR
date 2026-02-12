"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Ban, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/requests/status-badge";
import { toast } from "@/hooks/use-toast";
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RequestRow {
  id: string;
  jobId: string;
  position: { label: string } | null;
  location: { label: string } | null;
  requestType: string;
  status: string;
  submittedBy: string | null;
  createdAt: string;
}

type SortField = "jobId" | "position" | "location" | "requestType" | "status" | "submittedBy" | "createdAt";
type SortDir = "asc" | "desc";

function getSortValue(row: RequestRow, field: SortField): string {
  switch (field) {
    case "jobId": return row.jobId;
    case "position": return row.position?.label ?? "";
    case "location": return row.location?.label ?? "";
    case "requestType": return row.requestType;
    case "status": return row.status;
    case "submittedBy": return row.submittedBy ?? "";
    case "createdAt": return row.createdAt;
  }
}

function SortableHead({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function RequestTable({
  title,
  requests,
  emptyMessage,
  showCancel,
}: {
  title: string;
  requests: RequestRow[];
  emptyMessage: string;
  showCancel?: boolean;
}) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const handleCancel = useCallback(async (id: string, jobId: string) => {
    if (!window.confirm(`Are you sure you want to cancel request ${jobId}?`)) return;

    setCancellingId(id);
    try {
      const res = await fetch(`/api/requests/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel request");
      }
      toast({ title: "Request cancelled", description: `Request ${jobId} has been cancelled.` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to cancel request",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  }, [router]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return requests;
    const q = filter.toLowerCase();
    return requests.filter((r) => {
      const statusLabel = REQUEST_STATUS_LABELS[r.status as RequestStatus] ?? r.status;
      const dateStr = format(new Date(r.createdAt), "MMM d, yyyy");
      return (
        r.jobId.toLowerCase().includes(q) ||
        (r.position?.label ?? "").toLowerCase().includes(q) ||
        (r.location?.label ?? "").toLowerCase().includes(q) ||
        r.requestType.toLowerCase().replace("_", " ").includes(q) ||
        r.status.toLowerCase().includes(q) ||
        statusLabel.toLowerCase().includes(q) ||
        (r.submittedBy ?? "").toLowerCase().includes(q) ||
        dateStr.toLowerCase().includes(q)
      );
    });
  }, [requests, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const colSpan = showCancel ? 8 : 7;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {title}{" "}
          <span className="text-muted-foreground font-normal text-sm">
            ({filtered.length})
          </span>
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Job ID" field="jobId" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Position" field="position" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Location" field="location" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Type" field="requestType" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Submitted By" field="submittedBy" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableHead label="Created" field="createdAt" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              {showCancel && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Link
                      href={`/requests/${request.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {request.jobId}
                    </Link>
                  </TableCell>
                  <TableCell>{request.position?.label ?? "—"}</TableCell>
                  <TableCell>{request.location?.label ?? "—"}</TableCell>
                  <TableCell className="capitalize">
                    {request.requestType.toLowerCase().replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell>{request.submittedBy ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(request.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  {showCancel && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(request.id, request.jobId)}
                        disabled={cancellingId === request.id}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Cancel request"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface RequestListProps {
  requests: RequestRow[];
  initialStatusFilter?: string;
}

const OPEN_STATUSES = new Set(["DRAFT", "PENDING_APPROVAL"]);

const STATUS_FILTER_LABELS: Record<string, string> = {
  DRAFT: "Drafts",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  KICKED_BACK: "Kicked Back",
  CANCELLED: "Cancelled",
};

export function RequestList({ requests, initialStatusFilter }: RequestListProps) {
  if (initialStatusFilter) {
    const filtered = requests.filter((r) => r.status === initialStatusFilter);
    const label = STATUS_FILTER_LABELS[initialStatusFilter] ?? initialStatusFilter;
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <Filter className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-blue-800">
            Showing <strong>{label}</strong> requests only.
          </span>
          <Link
            href="/requests"
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-white border px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <X className="h-3 w-3" />
            Show All
          </Link>
        </div>
        <RequestTable
          title={label}
          requests={filtered}
          emptyMessage={`No ${label.toLowerCase()} requests.`}
          showCancel={OPEN_STATUSES.has(initialStatusFilter)}
        />
      </div>
    );
  }

  const openRequests = requests.filter((r) => OPEN_STATUSES.has(r.status));
  const closedRequests = requests.filter((r) => !OPEN_STATUSES.has(r.status));

  return (
    <div className="space-y-8">
      <RequestTable
        title="Open Requests"
        requests={openRequests}
        emptyMessage="No open requests."
        showCancel
      />
      <RequestTable
        title="Closed Requests"
        requests={closedRequests}
        emptyMessage="No closed requests."
      />
    </div>
  );
}
