# Architecture Review

An honest account of how Wellspring is built today—not how I wish it were built. The product is a **multi-tenant creator admin portal**: signup/login, programs, sessions with S3 media, CSV bulk import, and audit. Stack: Express + Sequelize + PostgreSQL (RLS), Next.js, MinIO locally.

---

## What I built and what I skipped — and why

**Built:** Auth (JWT + refresh cookie + CSRF), program/session CRUD, presigned media uploads, a bulk wizard (presign media → CSV → async job + polling), audit via an in-process event bus, and Docker-compose dev (Postgres, Mailhog, MinIO). Tenant scoping uses DB RLS plus Sequelize hooks—not a filter we only remember in code review.

**Skipped:**

- No learner-facing API or CDN playback product—admin only.
- No real job queue—bulk runs in-process (`setImmediate` + `asyncLocalStorage`), not Bull/SQS.
- No RBAC—one user per tenant at signup.
- Almost no automated tests beyond one mocked tenant-isolation case.
- No metrics/tracing—Winston logs only.
- Legacy sync bulk endpoint (`POST /uploads/bulk`) still exists; the UI uses jobs.

I optimized for **domain modeling and tenant safety** over operational maturity. Ops and scale are mostly design notes, not proven in code.

---

## Tenant isolation strategy

**Choice:** Single schema (`wellspring`), shared tables, **`tenant_id` on every row** + **PostgreSQL RLS** + **`BaseModel` hooks** reading `tenantId` from Node `AsyncLocalStorage`.

**Why not schema-per-tenant?** Strong isolation, but painful migrations, pooling, and ops. For hundreds of B2B tenants, **shared schema + RLS** is the usual trade: one migration path, enforcement even if app code forgets a filter.

**In practice:** `authMiddleware` sets ALS after JWT verify. Hooks inject `tenant_id` on queries. RLS uses `current_setting('app.current_tenant_id', true)`—we do **not** explicitly `SET` that GUC on every DB connection; background bulk jobs must `asyncLocalStorage.run({ tenantId }, …)`. Easy to get wrong on new entry points.

**~100 creators:** Comfortable with indexes on `(tenant_id, …)`, modest pool, single region.

The frontend never sends `tenant_id`; trust is entirely server-side from the JWT. That is correct, but it means every new endpoint must go through the protected middleware chain—there is no “internal admin bypass” by design.

**~10,000 creators:** Shared schema can still work, but bulk imports, audit growth, and support load hurt first. I would add: read replicas for lists, audit partitioning/archival, a real queue for bulk work, PgBouncer, and explicit per-request `SET app.current_tenant_id`. Schema-per-tenant only for regulatory hard isolation—not performance alone at this scale.

---

## Bulk import design

**Model:** Presign + browser PUT media keyed by `client_key` + extension; CSV creates sessions pointing at S3 keys. Async: `bulk_upload_jobs`, poll status, per-row progress counters.

**Idempotency (partial):**

- **Skip, not upsert:** Existing `(tenant, program, client_key)` → `skipped_count`. Re-import does not duplicate; it also does not update metadata or media.
- **Media must exist:** `resolveMediaPathForClientKey` probes S3; missing file → row failure.
- **No whole-CSV transaction:** Each row is its own `create`. Crash mid-job = partial import.
- **No in-flight dedup:** Double-submit can run two jobs racing on the same keys.

**Handled:** per-row validation errors, missing media, DB errors, job crash → `failed` + message. The UI pre-checks existing `client_key`s before upload so operators see skips early; the server re-checks at import time. **Weak:** concurrent jobs, retry-failed-rows-only, scanning, strict CSV size policy. I would not call this “exactly-once delivery”—it is “safe to re-run without duplicates,” not “converges to latest CSV state.”

---

## S3 upload flow

**Flow:** `POST /uploads/presign` → browser PUT → session stores `media_file_path`. Keys: `tenants/{tenantId}/programs/{programId}/sessions/{filename}`. `validateSessionMediaObjectKey` checks prefix + `HeadObject`.

**Security:**

- **Good:** No large bodies through API; tenant-prefixed keys; path sanitization; `S3_PUBLIC_ENDPOINT` so browsers avoid Docker-internal hostnames.
- **Weak:** No virus scan; no enforced max size at presign; single dev bucket credentials; PUT not tightly bound to checksum. Client could upload junk to their own prefix if checks hold.

**Large files:** Today = single PUT presign. For big video: multipart upload with presigned parts, server-side upload session, per-tenant size caps, optional transcoding on `ObjectCreated`, CloudFront for GET.

---

## Parts of my code I'm not fully confident in

1. **RLS + ALS** — Hooks filter Sequelize; I have not proven behavior under pool reuse or without explicit `SET` on the connection.
2. **Bulk runner** — In-process, no survive-restart, DB update per row.
3. **`resolveMediaPathForClientKey`** — Hardcoded extension list + HeadObject loops; brittle for odd names.
4. **Audit events** — `setImmediate` handlers; no outbox if process dies after commit.
5. **Frontend auth** — Tokens + refresh; no E2E for CSRF/upload paths.
6. **Sync bulk route** — Still in the API; confusing surface area.

---

## What I would change with two more days

**Day 1:** Request-scoped DB transaction with explicit `SET app.current_tenant_id`; integration tests proving cross-tenant 404s; Redis (or similar) queue + job dedup key; remove or hide sync bulk.

**Day 2:** Presign size/content-type limits; bulk batched transactions + export failures JSON; request ID logging; one Playwright path (login → program → upload → session). I would also document the skip-vs-upsert contract in OpenAPI so integrators do not assume CSV is a full sync.

I deliberately did not add caching (Redis for program lists, etc.)—correctness and tenant boundaries mattered more than latency for this scope.

---

**Bottom line:** Solid for a **focused admin MVP** with real tenant boundaries and a credible bulk/media story. Not production-complete for high scale or strict compliance without queueing, explicit RLS session binding, and stronger upload governance. I prefer this honesty over claiming enterprise-ready isolation.
