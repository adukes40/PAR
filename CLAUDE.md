# PAR System — Architecture Reference

Position Authorization Request system for Caesar Rodney School District.

## Stack

- **Runtime**: Next.js 16 / React 19 / TypeScript
- **DB**: PostgreSQL 16 via Prisma ORM
- **Auth**: NextAuth v5 (beta) — Google OAuth + Credentials, JWT sessions, PrismaAdapter
- **Deploy**: LXC container, Caddy (TLS) → Next.js standalone on port 3000, systemd `par-app.service`
- **Build**: `npm run build && systemctl restart par-app`

## Auth Flow

```
Google sign-in → signIn callback (src/lib/auth.ts)
  → checkGroupMembership (src/lib/google-admin.ts) via Google Admin SDK
  → checks 4 Google Groups: paradmins, parhrusers, parauthorizers, parusers
  → if not in any group → AccessDenied
  → mapGroupsToRole picks highest: ADMIN > HR > AUTHORIZER > USER
  → upserts user record with role
  → JWT callback stamps role + id into token
```

Credentials sign-in (admin only) bypasses group check — bcrypt password compare against `user.passwordHash`.

## Middleware (src/proxy.ts)

NextAuth `auth()` as middleware. Checks every request:
- Unauthenticated → redirect to `/auth/signin` (pages) or 401 (API)
- Page RBAC: `/admin/settings`, `/admin/audit-log` → ADMIN; `/admin/*` → ADMIN|HR; `/approvals` → ADMIN|HR|AUTHORIZER
- API write RBAC: same role mapping, GET always allowed

## Auth Helpers (src/lib/auth-helpers.ts)

All return `{ session, error }` pattern — call at top of API routes:
- `requireAuth()` — any authenticated user
- `requireAdmin()` — ADMIN only
- `requireHROrAdmin()` — HR or ADMIN
- `requireApprover()` — ADMIN, HR, or AUTHORIZER

## Approval Workflow

Sequential chain — one approver at a time in `sortOrder`:

1. **Submit** (`/api/requests/[id]/submit`): DRAFT/KICKED_BACK → PENDING_APPROVAL. Creates ApprovalStep rows from all active Approvers.
2. **Approve** (`/api/requests/[id]/approve` action=approve): Marks current step APPROVED. If all steps done → request APPROVED.
3. **Kick Back** (action=kick_back): Resets steps at/after `kickBackToStep` to PENDING. Request → KICKED_BACK. Submitter can resubmit.
4. **Reopen** (action=reopen): APPROVED → PENDING_APPROVAL, resets all steps.

Delegates: approvers can have delegates (`ApproverDelegate`) who act on their behalf via `actingAs`.

## Data Model (prisma/schema.prisma)

Core models:
- **User** — email, role, passwordHash (optional), linked to DropdownOption for building/position
- **ParRequest** — the PAR form: jobId (PAR-YYYY-NNNN), position/location/fundLine (FK to DropdownOption), requestType, employmentType, status, submittedBy
- **ApprovalStep** — one per approver per request: stepOrder, status, approvedBy, kickBackReason
- **Approver** — ordered chain of approvers with delegates
- **DropdownCategory/DropdownOption** — configurable dropdowns (position, location, fund_line)
- **AppSetting** — key/value store for Google integration config (service account key, group emails)
- **AuditLog** — every mutation logged: entityType, action, changedBy (from session), changes (JSON diff)
- **JobIdCounter** — singleton for atomic PAR-YYYY-NNNN generation (resets yearly)

## Key Files

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config — providers, signIn/jwt/session callbacks |
| `src/lib/google-admin.ts` | Google Admin SDK — group membership, add/remove members |
| `src/lib/db/settings.ts` | AppSetting CRUD with 30s in-memory cache |
| `src/lib/db/audit.ts` | Audit logging with field-level diff |
| `src/lib/db/approvals.ts` | Approval workflow transactions (submit, approve, kickBack, reopen) |
| `src/lib/db/requests.ts` | ParRequest CRUD |
| `src/lib/job-id.ts` | Atomic PAR-YYYY-NNNN generator |
| `src/lib/constants.ts` | All enums, role priority, labels |
| `src/lib/types.ts` | Prisma payload types, API response wrappers |
| `src/proxy.ts` | Middleware — auth check + page/API RBAC |

## API Routes

| Route | Auth | Purpose |
|---|---|---|
| `/api/requests` | requireAuth | List (GET) / Create (POST) PAR requests |
| `/api/requests/[id]` | requireAuth | Get (GET) / Update (PATCH) single request |
| `/api/requests/[id]/submit` | requireAuth | Submit for approval |
| `/api/requests/[id]/approve` | requireAuth | Approve / Kick back / Reopen |
| `/api/requests/[id]/cancel` | requireAuth | Cancel request |
| `/api/approvals/queue` | requireAuth | Pending steps for an approverId |
| `/api/approvers` | requireHROrAdmin | CRUD + reorder approvers |
| `/api/approvers/[id]/delegates` | requireHROrAdmin | Add/remove delegates |
| `/api/users` | requireHROrAdmin | CRUD users (handles Google Group sync) |
| `/api/dropdowns` | requireAuth(GET) / requireHROrAdmin(write) | Dropdown categories + options |
| `/api/dropdowns/options/suggest` | requireAuth | User-suggested options (needsReview=true) |
| `/api/settings` | requireAdmin | Google integration settings |
| `/api/audit-logs` | requireAdmin | Paginated audit log |

## Conventions

- All mutations audit-logged via `createAuditLog()` — `changedBy` always from session, never client-supplied
- API routes validate with Zod, return `NextResponse.json()`
- Prisma models use `@@map()` for snake_case table names, UUIDs for PKs
- Google Group sync happens on user create/update/delete (role changes trigger group membership changes)
- `setup.sh` generates DB password, NEXTAUTH_SECRET, admin password
- Env in `/opt/par/.env`, loaded by systemd `EnvironmentFile=`
