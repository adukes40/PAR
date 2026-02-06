// Request statuses
export const REQUEST_STATUS = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  KICKED_BACK: "KICKED_BACK",
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

// Request types
export const REQUEST_TYPE = {
  NEW: "NEW",
  REPLACEMENT: "REPLACEMENT",
} as const;

export type RequestType = (typeof REQUEST_TYPE)[keyof typeof REQUEST_TYPE];

// Employment types
export const EMPLOYMENT_TYPE = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
} as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPE)[keyof typeof EMPLOYMENT_TYPE];

// Position duration
export const POSITION_DURATION = {
  TEMPORARY: "TEMPORARY",
  REGULAR: "REGULAR",
} as const;

export type PositionDuration = (typeof POSITION_DURATION)[keyof typeof POSITION_DURATION];

// Approval step statuses
export const APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  KICKED_BACK: "KICKED_BACK",
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

// Dropdown category slugs (these are the canonical names used in the DB)
export const DROPDOWN_CATEGORIES = {
  POSITION: "position",
  LOCATION: "location",
  FUND_LINE: "fund_line",
} as const;

export type DropdownCategorySlug =
  (typeof DROPDOWN_CATEGORIES)[keyof typeof DROPDOWN_CATEGORIES];

// Audit log entity types
export const AUDIT_ENTITY_TYPE = {
  PAR_REQUEST: "PAR_REQUEST",
  APPROVAL_STEP: "APPROVAL_STEP",
  DROPDOWN_OPTION: "DROPDOWN_OPTION",
  DROPDOWN_CATEGORY: "DROPDOWN_CATEGORY",
  APPROVER: "APPROVER",
  APPROVER_DELEGATE: "APPROVER_DELEGATE",
} as const;

export type AuditEntityType =
  (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

// Audit log actions
export const AUDIT_ACTION = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  DELETED: "DELETED",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  KICKED_BACK: "KICKED_BACK",
  RESUBMITTED: "RESUBMITTED",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

// Human-readable labels for display
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  KICKED_BACK: "Kicked Back",
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  NEW: "New Position",
  REPLACEMENT: "Replacement",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
};

export const POSITION_DURATION_LABELS: Record<PositionDuration, string> = {
  TEMPORARY: "Temporary",
  REGULAR: "Regular",
};
