import type { Prisma } from "@prisma/client";

// Full PAR request with all relations loaded
export type ParRequestWithRelations = Prisma.ParRequestGetPayload<{
  include: {
    position: true;
    location: true;
    fundLine: true;
    approvalSteps: {
      include: {
        approver: {
          include: {
            delegates: true;
          };
        };
      };
      orderBy: {
        stepOrder: "asc";
      };
    };
  };
}>;

// Approver with delegates
export type ApproverWithDelegates = Prisma.ApproverGetPayload<{
  include: {
    delegates: true;
  };
}>;

// Dropdown category with options
export type DropdownCategoryWithOptions = Prisma.DropdownCategoryGetPayload<{
  include: {
    options: {
      orderBy: {
        sortOrder: "asc";
      };
    };
  };
}>;

// Audit log entry with parsed changes
export interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

export interface ParsedAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
