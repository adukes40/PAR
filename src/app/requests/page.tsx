import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/requests/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listRequests } from "@/lib/db/requests";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || undefined;
  const search = params.search || undefined;
  const page = parseInt(params.page || "1", 10);

  const result = await listRequests({ status, search, page, limit: 25 });

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

      {result.data.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>No requests found. Create your first position authorization request.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((request) => (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(result.page - 1) * result.limit + 1}–
                {Math.min(result.page * result.limit, result.total)} of {result.total}
              </p>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link href={`/requests?page=${result.page - 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link href={`/requests?page=${result.page + 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}>
                    <Button variant="outline" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
