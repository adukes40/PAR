import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/lib/constants";

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  KICKED_BACK: "destructive",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariantMap[status] ?? "outline";
  const label = REQUEST_STATUS_LABELS[status as RequestStatus] ?? status;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
