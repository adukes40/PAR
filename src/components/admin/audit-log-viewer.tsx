"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ENTITY_TYPES = [
  { value: "__all__", label: "All Types" },
  { value: "PAR_REQUEST", label: "PAR Request" },
  { value: "APPROVAL_STEP", label: "Approval Step" },
  { value: "DROPDOWN_OPTION", label: "Dropdown Option" },
  { value: "DROPDOWN_CATEGORY", label: "Dropdown Category" },
  { value: "APPROVER", label: "Approver" },
  { value: "APPROVER_DELEGATE", label: "Approver Delegate" },
];

const ACTIONS = [
  { value: "__all__", label: "All Actions" },
  { value: "CREATED", label: "Created" },
  { value: "UPDATED", label: "Updated" },
  { value: "DELETED", label: "Deleted" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "KICKED_BACK", label: "Kicked Back" },
  { value: "RESUBMITTED", label: "Resubmitted" },
];

const ACTION_COLORS: Record<string, string> = {
  CREATED: "bg-sky-50 text-sky-800",
  UPDATED: "bg-amber-50 text-amber-800",
  DELETED: "bg-red-50 text-red-800",
  SUBMITTED: "bg-violet-50 text-violet-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  KICKED_BACK: "bg-red-50 text-red-800",
  RESUBMITTED: "bg-violet-50 text-violet-800",
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityType, setEntityType] = useState("__all__");
  const [action, setAction] = useState("__all__");
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (entityType !== "__all__") params.set("entityType", entityType);
      if (action !== "__all__") params.set("action", action);

      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [entityType, action]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Audit Log {!loading && `(${total} entries)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit log entries found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.createdAt), "MMM d, yyyy h:mm:ss a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={ACTION_COLORS[log.action] || ""}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.entityType.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-sm">{log.changedBy || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setDetailLog(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
            <DialogDescription>
              {detailLog && format(new Date(detailLog.createdAt), "MMM d, yyyy h:mm:ss a")}
            </DialogDescription>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Action</p>
                  <Badge variant="secondary" className={ACTION_COLORS[detailLog.action] || ""}>
                    {detailLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Entity Type</p>
                  <p>{detailLog.entityType.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Entity ID</p>
                  <p className="font-mono text-xs break-all">{detailLog.entityId}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Changed By</p>
                  <p>{detailLog.changedBy || "—"}</p>
                </div>
              </div>

              {detailLog.changes && Object.keys(detailLog.changes).length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-2">Changes</p>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead>
                          <TableHead>Old Value</TableHead>
                          <TableHead>New Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(detailLog.changes).map(([field, change]) => (
                          <TableRow key={field}>
                            <TableCell className="font-medium">{field}</TableCell>
                            <TableCell className="text-sm text-red-700">
                              {change.old === null ? "null" : String(change.old)}
                            </TableCell>
                            <TableCell className="text-sm text-green-700">
                              {change.new === null ? "null" : String(change.new)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {detailLog.metadata && Object.keys(detailLog.metadata).length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-2">Metadata</p>
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-auto">
                    {JSON.stringify(detailLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
