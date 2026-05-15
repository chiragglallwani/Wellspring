# Wellspring — Code Summary (Day 1)

This document explains how the major parts of the codebase fit together. Wellspring is a **multi-tenant creator admin portal**: each organization (tenant) manages programs, sessions (audio/video lessons), media in S3, and an audit trail of important actions.

**Stack:** Express + Sequelize + PostgreSQL (backend), Next.js App Router + Redux + axios (frontend). Local dev runs the API in Docker (Postgres, Mailhog, MinIO) and the frontend with `npm run dev`.

**Request path (backend):** `routes/` → `controllers/` → `services/modules/` → `database/models/`. Protected routes also pass through `authMiddleware` and `csrfMiddleware` (see [Auth](#auth)).

---

## Auth

**What it does:** Handles signup, login, logout, token refresh, and password reset via email OTP. Issues a short-lived JWT access token, an httpOnly refresh token cookie, and a CSRF token (header + cookie) used on mutating requests.

**Key design choice:** Authentication is **JWT + refresh cookie + CSRF double-submit**, not session tables. On login/refresh, `auth.controller` sets `Authorization`, `csrf_token` response headers, and cookies. The frontend stores access/CSRF tokens in memory/local storage (`lib/tokenStore`) and sends them on API calls; `api.ts` retries once on 401 by calling `/auth/refresh`.

**Non-obvious notes:**
- Public routes live under `/api/v1/auth/*` and skip auth headers (`isPublicAuthPath` in `frontend/services/api.ts`).
- Password reset uses a **6-digit OTP** stored on `users.reset_code` (not a JWT reset link). Flow: request → verify → confirm.
- `authMiddleware` decodes the JWT, sets `req.user`, and calls `setAsyncStorage({ tenantId })` so tenant-scoped DB queries work for the rest of the request.
- Signup creates **both** a `tenant_profiles` row and a `users` row in one transaction (`auth.service.ts`).

**Main paths:** `backend/src/routes/auth.routes.ts`, `services/modules/auth.service.ts`, `frontend/services/auth.ts`, `views/LoginPage.tsx`, `views/ForgotPasswordPage.tsx`.

---

## Tenants

**What it does:** Represents an organization (wellness studio / creator business). There is no separate `/tenants` REST module—tenants are created at signup and referenced everywhere via `tenant_id`. The `tenant_profiles` table (`Tenant` model) holds `tenant_id`, `name`, and `email`.

**Key design choice:** **Tenant isolation is enforced in the database**, not only in application code. Tenant-scoped tables (`users`, `programs`, `sessions`, `audit_logs`, `bulk_upload_jobs`) use PostgreSQL **row-level security (RLS)** plus Sequelize hooks on `BaseModel` that always filter by `tenant_id` from AsyncLocalStorage.

**Non-obvious notes:**
- You must have `tenantId` in AsyncLocalStorage before any `UserModel` / `ProgramsModel` / `SessionModel` query. That happens in `authMiddleware` for API requests, or manually via `asyncLocalStorage.run({ tenantId }, …)` for background jobs (e.g. bulk upload in `bulkUploadJob.service.ts`).
- Login resolves the tenant by **email on `tenant_profiles`**, then loads the user under that tenant.
- `tenant_id` is a 12-character alphanumeric string generated at signup, not a UUID.
- To extend: new tenant-scoped tables need RLS policies in a migration (copy the pattern from `00002-create-users-table.ts`) and should extend `BaseModel`.

**Main paths:** `database/models/system/Tenant.ts`, `database/models/tenant/BaseModel.ts`, `utils/asyncstorage.ts`, `middlewares/auth.middleware.ts`.

---

## Programs

**What it does:** CRUD for wellness programs (name, description, length in days, active/draft flag). Programs belong to one tenant and own many sessions.

**Key design choice:** Programs are a thin domain layer—`program.service.ts` owns business logic; successful creates emit `PROGRAM_CREATED` for audit via the event bus (see [Events](#events)). List endpoints attach **`sessionsCount`** per program via a second aggregated query on `SessionModel` (not a raw SQL subquery).

**Non-obvious notes:**
- API field is `isActive` (boolean); the UI maps it to `LIVE` / `DRAFT`.
- `length` on a program is **duration in days**, not session count—session count comes from `sessionsCount` on list responses.
- All program routes are behind `authMiddleware` + `csrfMiddleware` (`routes/index.ts`).
- Frontend: `views/ProgramsPage.tsx` + `services/programs.ts`; route shell in `app/programs/page.tsx` wrapped with `RequireAuth`.

**Main paths:** `routes/program.routes.ts`, `services/modules/program.service.ts`, `database/models/tenant/ProgramsModel.ts`, `frontend/views/ProgramsPage.tsx`.

---

## Sessions

**What it does:** CRUD and reordering for individual lessons inside a program. Each session has metadata (title, type, duration, instructor, tags, `ordered_position`) and a **`client_key`** (stable external id) plus **`media_file_path`** (S3 object key from presign upload).

**Key design choice:** Media is **not uploaded through the API body**. Clients call `/uploads/presign`, PUT the file directly to S3/MinIO, then pass the returned `key` as `media_file_path` when creating/updating a session. `session.service` validates the key belongs to the tenant/program via `s3.service`.

**Non-obvious notes:**
- **`client_key` is unique per (tenant, program)**, not globally—see `clientKeyAvailability.service.ts` and migration `00009-sessions-client-key-per-program.ts`.
- Reorder is a dedicated flow that emits `SESSION_REORDERED` and updates `ordered_position`.
- Session create/update/delete emits events that write audit rows asynchronously.
- Frontend: `views/SessionsPage.tsx`, `services/sessions.ts`; program context is usually selected in the UI before loading sessions.

**Main paths:** `routes/session.routes.ts`, `services/modules/session.service.ts`, `services/modules/clientKeyAvailability.service.ts`, `database/models/tenant/SessionModel.ts`.

---

## Uploads

**What it does:** Presigned S3 URLs for session media, playback URLs, CSV bulk import (sync and async job), and checks for existing `client_key`s before upload. Combines file storage concerns with session creation at scale.

**Key design choice:** **Two bulk paths**—(1) legacy/sync `POST /uploads/bulk` parses CSV in-request, and (2) **job-based** `POST /uploads/bulk-jobs` creates a `bulk_upload_jobs` row and processes CSV in the background with polling via `GET /uploads/bulk-jobs/:jobId`. Jobs re-establish tenant context with `asyncLocalStorage.run` because they leave the HTTP request lifecycle.

**Non-obvious notes:**
- Presign uses **`S3_PUBLIC_ENDPOINT`** so browsers hit `localhost:9000`, not Docker-internal `minio:9000` (`s3.service.ts`).
- Bulk CSV rows are matched to media by **`client_key` + file extension**—there is no `object_key` column in CSV anymore.
- Rows whose `client_key` already exists are **skipped** (`skipped_count` on the job), not failed.
- Multipart uploads must not send `Content-Type: application/json`; `api.ts` strips it for `FormData`.
- Frontend bulk UI: `components/bulk-uploads/BulkUploadDialog.tsx`, `services/bulkUploadJobs.ts`, `services/uploads.ts`.

**Main paths:** `routes/upload.routes.ts`, `services/modules/upload.service.ts`, `services/modules/bulkUploadJob.service.ts`, `services/storage/s3.service.ts`, `middlewares/uploadCsv.middleware.ts`.

---

## Audit

**What it does:** Append-only log of significant actions (program/session lifecycle, tenant signup, bulk import summary, password reset). Creators view/filter logs in the Audit page.

**Key design choice:** Most audit rows are written **indirectly through domain events**, not from controllers. Handlers in `events/handlers/` call `auditService.recordAudit` after the main transaction commits, keeping HTTP handlers thin.

**Non-obvious notes:**
- `action` values are string constants in `events/types/EventTypes.ts` (e.g. `SESSION_CREATED`, `BULK_SESSION_CREATED`).
- `target_entity` is a human-readable summary string (e.g. program name, bulk import stats)—not a strict FK.
- List endpoint joins `UserModel` to show actor name/email; filters support action type and date range.
- Frontend filter labels live in `frontend/services/audit.ts`; page under `app/audit/`.

**Main paths:** `routes/audit.routes.ts`, `services/modules/audit.service.ts`, `database/models/tenant/AuditLogModel.ts`, `events/handlers/*`.

---

## Events

**What it does:** In-process pub/sub (`EventEmitter`) decoupling “business action completed” from side effects (today: audit logging). Registered at server startup in `app.ts` via `eventService.registerHandlers()`.

**Key design choice:** **Synchronous emit, asynchronous handlers**—`emitEventHelper` uses `setImmediate` so the HTTP response is not blocked by audit writes, but handlers still run in the same Node process (not a message queue).

**Non-obvious notes:**
- To audit a new action: add a constant to `EventTypes`, emit from the service after commit, and register a handler that calls `auditService.recordAudit`.
- Handlers should be idempotent-friendly; failures are logged but do not roll back the original mutation.
- Bulk completion builds a descriptive `targetEntity` string in `bulkUploadJob.service` before emitting `BULK_SESSION_CREATED`.

**Main paths:** `events/event.service.ts`, `events/types/EventTypes.ts`, `events/handlers/`.

---

## Database & migrations

**What it does:** PostgreSQL schema `wellspring`, Umzug migrations on boot, Sequelize models, and seed data for local demos.

**Key design choice:** Migrations split into **`schema/`** (create `wellspring` schema) and **`system/`** (tables, RLS, alters). `app.ts` runs schema migrations, connects Sequelize, then runs system migrations—no separate manual step in normal dev.

**Non-obvious notes:**
- Demo users/programs: migration `00011-seed-demo-users-and-programs.ts` (`demo1@wellspring.local` / `demo2@wellspring.local`, password `Wellspring1!`).
- Models under `database/models/tenant/` extend `BaseModel`; system-wide `Tenant` is under `database/models/system/`.
- Soft deletes: tenant models use `paranoid: true` (`deletedAt`).
- One-off migrate script: `tsx src/database/migrations/migrate.ts` (usually unnecessary if the API already started).

**Main paths:** `services/migration.service.ts`, `services/database.service.ts`, `database/migrations/`.

---

## Storage (S3 / MinIO)

**What it does:** Bucket management, presigned PUT/GET URLs, and validation that session media keys live under the expected tenant/program prefix.

**Key design choice:** AWS SDK S3 client pointed at **MinIO locally** with `S3_FORCE_PATH_STYLE=true`. Separate internal vs public endpoints so Docker networking does not break browser uploads.

**Non-obvious notes:**
- Object keys are structured to include tenant/program context—always validate through `s3.service` before persisting `media_file_path`.
- CORS on MinIO must allow `http://localhost:3000` (set in `docker-compose.yml`).

**Main paths:** `services/storage/s3.service.ts`, env vars in `backend/.env.example`.

---

## Notifications (email)

**What it does:** Sends transactional email (password reset OTP) via nodemailer. Local dev uses **Mailhog** (SMTP on 1025, UI on 8025).

**Key design choice:** HTML templates live as TypeScript builders (`notification/templates/`), not separate `.html` files—easy to version but keep templates small.

**Non-obvious notes:** `emailDelivery.service.ts` reads `SMTP_*` and `EMAIL_FROM` from env; password reset never reveals whether an email exists in the DB (generic success message).

**Main paths:** `notification/emailDelivery.service.ts`, `notification/templates/passwordResetOtp.ts`.

---

## Frontend (overview)

**What it does:** Next.js App Router UI for login, programs, sessions, bulk uploads, and audit. Uses shared layout (`Sidebar`, `Header`) on authenticated routes.

**Key design choice:** **Thin route files, fat `views/`**—`app/*/page.tsx` only composes layout + `RequireAuth` + a view component. API access is centralized in `services/*` atop a single `api` axios instance with auth/CSRF interceptors.

**Non-obvious notes:**
- `RequireAuth` + `AuthProvider` restore session on load via `/auth/refresh` (`services/authSession.ts`).
- Redux (`store/slices/authSlice`) holds user profile only—not tokens.
- Env: `NEXT_PUBLIC_API_URL` must match the API origin (default `http://localhost:4443`).
- For new pages: add `app/<route>/page.tsx`, a view under `views/`, and a service module mirroring the backend resource.

| UI area | View | Service |
|--------|------|---------|
| Login / signup | `LoginPage.tsx` | `auth.ts` |
| Forgot password | `ForgotPasswordPage.tsx` | `auth.ts` |
| Programs | `ProgramsPage.tsx` | `programs.ts` |
| Sessions | `SessionsPage.tsx` | `sessions.ts`, `uploads.ts` |
| Bulk uploads | `BulkUploadsPage.tsx`, `BulkUploadDialog.tsx` | `bulkUploadJobs.ts` |
| Audit | audit view | `audit.ts` |

---

## How to extend safely (checklist)

1. **New tenant-scoped table:** migration with RLS, model extending `BaseModel`, service using `getTenantId()`, route behind auth + CSRF.
2. **New audited action:** `EventTypes` + emit from service + handler calling `auditService.recordAudit`.
3. **New file upload:** presign in `s3.service`, validate key in session/upload service, never trust client-provided paths blindly.
4. **Background work:** wrap in `asyncLocalStorage.run({ tenantId }, …)` so RLS and hooks see the correct tenant.

For local setup, see the root [README.md](../README.md).
