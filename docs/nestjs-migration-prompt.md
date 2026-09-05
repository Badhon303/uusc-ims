You are a senior NestJS architect and backend engineer.

Build my UUSC Indoor Management System backend as a fresh, production-ready NestJS application. Do not attempt to migrate data from the existing Payload CMS database; this is a clean rebuild for the target stack.

You have access to the existing repository. Inspect its implementation to understand the required behavior, then design and build the replacement. Do not modify the existing application until I approve the plan. Build the replacement in a separate directory or repository whose location I approve.

## 1. Required technology stack

- Framework: NestJS with TypeScript in strict mode
- Database: PostgreSQL
- ORM and migrations: Prisma
- Authentication: JWT access tokens and rotating refresh tokens
- File storage: Cloudflare R2 using the S3-compatible API
- Realtime: Socket.IO
- Background jobs: BullMQ with Redis
- API documentation: Swagger/OpenAPI
- Deployment: Docker and Docker Compose
- Testing: Jest and Supertest
- Validation: class-validator and class-transformer
- Logging: structured logging with request correlation IDs

Use compatible, stable dependency versions. Prefer releases older than seven days and commit a lockfile.

## 2. Configuration and secret handling

Use environment variables for all secrets.

Required configuration includes:

DATABASE_URL
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_TTL
JWT_REFRESH_TTL
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
CORS_ORIGINS
PORT
NODE_ENV

Inspect the existing notification/email workflows and add SMTP or email-provider configuration if needed.

The target PostgreSQL database and Redis service are external services. Obtain their connection URLs from my private environment configuration.

Never:
- Hardcode credentials.
- Print environment secrets or full connection URLs.
- Commit real .env files.
- Run schema synchronization, destructive migrations, database resets,
  or data imports against external databases without my approval.
- Assume an external database is empty.
- Disable TLS certificate validation to make connections work.

Provide a .env.example with placeholders only.

Use local disposable PostgreSQL and Redis containers for automated testing. Treat externally configured services as potentially production infrastructure.

## 3. Discovery before implementation

Read and analyze:

- src/payload.config.ts
- Registered collection configurations
- Collection hooks
- Custom API endpoints
- Access-control helpers
- Multi-tenant plugin configuration and injected fields
- Subscription and billing utilities
- Background jobs
- Report queries
- Authentication and password-reset behavior
- Upload and media usage
- Frontend API calls, where available
- src/payload-types.ts
- docs/uusc-erd.puml

The ERD and generated types are supporting references, not the sole source of truth. Some may be outdated.

Distinguish:
- Registered collections from unused files.
- Persisted fields from computed fields.
- Embedded arrays from standalone entities.
- Real foreign keys from logical references.
- Tenant-scoped data from platform-wide data.
- Implemented behavior from comments or intended behavior.

Produce:
1. An inventory of modules, entities, endpoints, hooks, and background jobs.
2. A field and relationship mapping from Payload to the proposed schema.
3. A role/permission matrix.
4. An API compatibility assessment.
5. A list of inconsistencies, security issues, and ambiguous requirements.
6. A phased implementation and data migration plan.

Ask focused questions for decisions that cannot be resolved from the source.

Wait for my approval before implementation.

## 4. Multi-tenant architecture

This is a multi-tenant SaaS application.

Platform Super Admin:
- Manages tenants and tenant provisioning.
- Assigns or replaces tenant administrators.
- Manages subscription settings and platform billing.
- Can access platform-level subscription audit information.
- Does not automatically receive unrestricted tenant business-record
  access; inspect the existing platform/workspace separation.

Tenant Admin:
- Each provisioned tenant must have exactly one designated tenant admin.
- Can create manager, coach, member, and student accounts for their tenant.
- Cannot create additional tenant admins or super admins.
- Cannot assign staff or guest roles unless I explicitly approve
  changing this requirement.
- Cannot move users between tenants.
- Cannot access another tenant's data.

Other users:
- Managers, coaches, members, and students can authenticate.
- Each receives only the permissions appropriate to their role.
- Existing staff and guest data must be accounted for during migration;
  do not silently delete or reinterpret these roles.

Inspect the current tenants[] membership structure. Propose whether to
retain it or use a single tenant per user, with explicit migration
implications. Do not silently discard memberships.

Tenant isolation must cover:
- List, detail, create, update, delete, and bulk operations
- Relationship assignment
- Search, aggregation, exports, and reporting
- File access
- Background jobs
- Socket.IO connections, subscriptions, and events
- User administration

Do not trust a tenant ID supplied in a request body, header, URL,
or Socket.IO room name without validating membership and permission.

Use explicit tenant context throughout the service/repository layer.
Do not rely only on controllers remembering to add tenantId filters.

Prevent cross-tenant foreign-key relationships. Use database constraints
where feasible and transactional validation elsewhere.

Enforce the single-admin invariant under concurrent requests:
- Prevent duplicate administrators with database-level guarantees.
- Provision tenant and initial administrator atomically.
- Provide an atomic administrator replacement workflow.
- Prevent deletion or demotion that leaves a tenant without an admin.

A check-then-insert query alone is not sufficient.

## 5. Authentication and authorization

Implement:

- Login
- Logout
- Refresh token rotation
- Logout from all sessions
- Current-user endpoint
- Change password
- Forgot password
- Reset password
- Role-based and record-level authorization
- Tenant membership checks
- Login throttling and brute-force protection

Requirements:
- Hash new passwords with Argon2id.
- Use short-lived access tokens.
- Store only hashes of refresh tokens.
- Track sessions with expiration and revocation.
- Rotate refresh tokens atomically.
- Detect replay/reuse and revoke the affected session/token family.
- Revoke appropriate sessions after password changes, resets,
  account disablement, or security-sensitive privilege changes.
- Validate JWT algorithm, issuer, audience, and expiration.
- Avoid user enumeration in authentication/recovery responses.
- Never return password hashes, reset tokens, or refresh token hashes.

For browser clients, prefer secure HttpOnly refresh-token cookies,
with explicit SameSite, CORS, and CSRF handling.

Document token storage and transport choices for any non-browser clients.

Do not assume Payload password hashes are compatible with Argon2id.
Inspect the existing hash format and propose either a secure
verify-and-rehash migration or a forced password-reset process.

Do not base authorization indefinitely on stale JWT role,
membership, or subscription claims.

## 6. Business modules

Inspect and migrate the registered equivalents of:

Platform:
- Tenants
- Users and tenant memberships
- Subscription invoices
- Subscription events

Operations:
- Media
- Members
- Students
- Managers
- Staff
- Coaches
- Packages
- Courts
- Court bookings
- Member schedules
- Training groups
- Training schedules
- Student attendance
- Student progress

Finance:
- Member payments
- Student payments
- Booking payments
- General payments
- Coach salaries
- Embedded manager/staff salary records, where implemented
- Expenditures
- Other income
- Sponsors

Tournaments:
- Tournaments
- Registrations
- Teams
- Matches
- Results

Supporting:
- Notifications
- Audit logs
- Reports and dashboards

Do not invent entities from outdated ERD entries.
Do not omit functionality merely because it is implemented as an
embedded array, hook, or custom endpoint instead of a collection.

Preserve implemented:
- Totals and due/paid calculations
- Payment and salary histories
- Registration fees
- Booking pricing and availability rules
- Schedule conflict checks
- Attendance and progress records
- Tournament eligibility, team, match, and result rules
- Reporting filters and aggregations

Use decimal-safe monetary representations, explicit rounding,
and currency handling. Do not use floating-point arithmetic for money.

Define timezone semantics for recurring schedules, booking times,
billing deadlines, and calendar-month calculations.

## 6.5 Payment model overview (two distinct payment streams)

This system has two independent payment directions. Do not collapse them
into a single generic "Payment" entity.

### 6.5.1 Platform subscription payments (Tenant → Super Admin / Platform)

The tenant pays the platform for the right to use the application.

- SubscriptionInvoices are created against a tenant by a super admin or
  by scheduled billing jobs.
- The invoice references an embedded plan snapshot at the time of issue.
- The tenant (or its admin) pays the invoice through the supported
  payment providers.
- Payment of a subscription invoice updates the tenant's subscription
  status, due dates, and may activate a lifetime plan.
- Setup fees are charged once per tenant.
- SubscriptionEvents record every status and plan transition.

Only super admins can create or void these invoices. Tenant admins can
read their own invoices, not other tenants'.

### 6.5.2 Tenant operational payments (Members / Students / Users → Tenant)

A tenant collects money from its own customers and users.

Income collections:
- MemberPayments: monthly or periodic fees paid by a club member.
- StudentPayments: monthly or periodic fees paid by an academy student.
- Payments: a general polymorphic payment collection covering
  membership, registration-fee, court-booking, and tournament-fee
  contexts. Payers may be members, students, or generic users.
- BookingPayments: payments tied to specific court bookings.
- TournamentRegistrations: may carry a registration fee that must be
  recorded as a payment.
- OtherIncomes: an income ledger entry that is auto-generated from
  successful Payments for accounting and reporting.

Income rules:
- Preserve per-member and per-student totalDue/totalPaid calculations.
- Preserve invoice number generation per tenant.
- Map every paid Payment to a corresponding OtherIncome.
- Distinguish registration fees, monthly fees, booking fees, and
  tournament fees in reporting.

Tenant expenses / outflow:
- CoachSalaries: the tenant pays a coach per month, with salary,
  bonus, and status (paid/unpaid). Each coach has one salary record
  with an embedded payment history.
- Expenditures: general expense categories such as maintenance,
  utilities, equipment, tournament expenses, salaries, facility, and
  miscellaneous.
- Sponsor amounts are recorded separately as a ledger of sponsor
  contributions.

Requirements:
- Tenant income must never be credited to another tenant.
- Tenant payments must not affect platform subscription balances.
- A Payment record should carry a clear context and, where applicable,
  a reference to the triggering record (member, student, booking,
  tournament registration).
- Decimal-safe amounts and currency handling must apply to both streams.
- Staff and manager salary workflows, if they exist, must be treated
  consistently with CoachSalaries or Expenditures depending on the
  existing implementation.

## 7. Subscription and billing behavior

Support:
- Trials
- Recurring monthly subscriptions
- One-time/lifetime purchases
- One-time setup fees
- Invoice line items and plan snapshots
- Payment recording and activation
- Billing reminders
- Grace periods
- Past-due, suspended, cancelled, and reactivated states
- Subscription events

The current tenant plan is embedded in the tenant configuration.
Do not reintroduce a required subscription plan name.

Use one grace-period setting per tenant.

System-managed dates and billing fields must be updated through
controlled service workflows, not arbitrary generic update DTOs.

Paid lifetime subscriptions must not expire or continue receiving
recurring invoices.

Prevent duplicate invoices, duplicate setup-fee charging, and repeated
payment side effects using transactions, constraints, and idempotency.

Inspect existing subscription enforcement carefully. Identify and
resolve inconsistencies involving:
- Active versus trialing subscriptions
- Trial end versus next billing date
- Grace-period boundaries
- Past-due versus suspended write restrictions
- Suspended-tenant read-only settings

Present an explicit transition table and approved permission behavior.
Do not copy contradictory behavior without calling it out.

Use payment-provider integrations only where existing code or approved
requirements support them. Do not invent working gateway integrations.

## 8. Database design and migrations

Use versioned Prisma migrations, not runtime schema synchronization.

Include:
- Appropriate foreign keys
- Tenant-aware uniqueness
- Tenant-prefixed indexes for common queries
- Check constraints or custom migration SQL where needed
- Created/updated timestamps
- Explicit deletion and retention rules

Normalize embedded arrays where useful, but preserve their meaning,
ordering, row identity, and history.

Represent polymorphic payment references safely. Explain how referential
integrity is maintained for member/student/user payers.

Keep financial records and audit history intact. Avoid cascade deletes
that erase billing or payment history.

Translate Payload hook behavior into explicit services and transactions.
Do not introduce recursive or hidden lifecycle side effects.

## 9. Cloudflare R2 storage

Implement:
- Authorized upload initiation
- Presigned uploads where appropriate
- Upload finalization/verification
- Media metadata persistence
- Authorized retrieval or presigned downloads
- Controlled deletion and orphan cleanup

Requirements:
- Enforce file size and allowed file-type limits.
- Verify uploaded objects before accepting finalized metadata.
- Use tenant-aware object keys for tenant-owned files.
- Explicitly distinguish shared/platform media from tenant-owned media.
- Prevent cross-tenant object access and deletion.
- Keep private uploads private.
- Define any image resizing/thumbnail behavior required by current media use.

Do not assume an object is authorized just because its key is known.

## 10. Socket.IO

Implement authenticated, authorized realtime notifications.

Use server-controlled tenant/user rooms.
Clients must not freely join arbitrary rooms.

Validate event payloads and enforce permissions per event.
Handle token expiry, session revocation, and reconnection.

Support horizontal scaling using a compatible Redis adapter.
Keep realtime updates consistent with committed database changes.

Inspect the source and propose which events are useful, such as:
- Notifications
- Booking changes
- Payment updates
- Tournament changes
- Subscription status changes

## 11. BullMQ jobs

Use separate API and worker processes.

Migrate existing jobs and add only those required for approved behavior:
- Subscription enforcement
- Billing reminders
- Notification/email delivery
- Media cleanup, if needed

Requirements:
- Idempotent job handlers
- Bounded retries and exponential backoff
- Failure visibility and logging
- Pagination/batching for large tenant datasets
- No accidental duplicate repeatable schedules across replicas
- Explicit tenant context
- No secrets or unnecessary personal information in job payloads
- Graceful worker shutdown

Use a transactional outbox or an equivalent reliable mechanism for
database changes that must trigger jobs or realtime events.

## 12. API design and compatibility

Use versioned REST endpoints, for example /api/v1.

Provide:
- DTO validation
- Pagination with safe limits
- Explicit filter and sort allowlists
- Consistent error responses
- Swagger schemas and authentication documentation
- Representative success and error examples

Inspect existing clients before deciding whether to preserve Payload-style
routes, request shapes, relationship population, and response envelopes.

Produce an old-to-new endpoint mapping.
Clearly identify frontend changes required by any breaking API changes.

Do not rewrite the frontend unless I approve it.

## 13. Testing

Use real disposable PostgreSQL and Redis services for relevant integration
tests, not only mocked repositories.

Cover:
- Authentication, token rotation, replay, expiry, and revocation
- Password recovery and password migration strategy
- Role escalation attempts
- Cross-tenant reads, writes, relationships, reports, and files
- Concurrent attempts to create a second tenant administrator
- Atomic tenant provisioning and administrator replacement
- Subscription transitions and grace-period boundary cases
- Lifetime subscriptions and setup-fee idempotency
- Financial calculations and transaction rollback
- Booking/schedule concurrency where applicable
- Background-job retry and duplicate execution behavior
- Socket.IO room isolation and session expiration

Translate existing business behavior into regression tests.
If existing behavior is incorrect, document the approved correction.

## 14. Docker and operations

Provide:
- Multi-stage production Dockerfile
- Non-root runtime user
- Separate API and worker commands
- Docker Compose for local PostgreSQL and Redis
- Configuration for external production PostgreSQL/Redis
- Health, readiness, and liveness endpoints
- Graceful shutdown
- Connection pooling and resource limits
- Structured logs without secrets
- Migration execution as an explicit deployment step

Do not expose Swagger publicly in production without an explicit policy.
Do not expose Redis, database ports, or admin tools unnecessarily.

Explain backup, restore, rollback, and cutover expectations.

## 15. Delivery process

Work in reviewable phases:

1. Discovery and approved architecture
2. Database schema and local infrastructure
3. Authentication, authorization, and tenant isolation
4. Platform provisioning and subscriptions
5. Operational business modules
6. Finance and reports
7. Media, notifications, realtime, and jobs
8. Full verification and deployment readiness

For each phase:
- State scope and assumptions.
- Implement working code.
- Run relevant tests, lint, type checks, and build.
- Report exact verification results.
- Update the task checklist.
- Identify blockers and remaining work.

Do not declare the migration complete based only on a successful build.
Do not leave placeholder services or TODO-only endpoints while claiming
they are implemented.

Final deliverables:
- Working NestJS backend
- Prisma schema and migrations
- Swagger/OpenAPI documentation
- Docker setup
- API and worker services
- Automated tests
- Environment template
- Setup, deployment, and cutover instructions
- Honest list of limitations or deferred work

Start by inspecting the repository and presenting the discovery findings
and build plan. Do not start generating the replacement application
until I approve that plan.
