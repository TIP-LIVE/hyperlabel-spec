# HyperLabel / TIP — Developer Guide

## Project Overview

TIP (tip.live) is a cargo tracking SaaS. Users stick IoT labels on shipments and track them door-to-door via cell tower triangulation. The system receives location data from Onomondo webhooks, geocodes coordinates, and presents tracking dashboards.

## Architecture

```
Monorepo: /Users/denyschumak/Documents/HyperLabel
├── app/              Next.js 16.1.5 (Turbopack), deployed to Vercel
│   ├── src/app/      App Router pages and API routes
│   ├── src/lib/      Shared logic (auth, db, device-report, etc.)
│   ├── src/components/  React components (shadcn/ui + feature components)
│   ├── src/emails/   React Email templates
│   └── prisma/       Schema + config
├── docs/             Investor docs (GitHub Pages)
└── SPEC.md           Product specification
```

### Key Infrastructure
- **Hosting**: Vercel (auto-deploy on push to `main`)
- **Database**: Neon PostgreSQL (pooled, EU West 2)
- **Auth**: Clerk (middleware in `app/src/proxy.ts`)
- **Payments**: Stripe (checkout + webhooks)
- **IoT Data**: Onomondo SIM platform (webhooks)
- **Email**: React Email templates via Resend
- **Domain**: tip.live (DNS on Namecheap)

---

## Critical Rules & Lessons Learned

### Onomondo Webhook Handler

The webhook endpoint (`app/src/app/api/v1/device/onomondo/location-update/route.ts`) is the most critical and most-debugged code path. Follow these rules strictly:

#### 1. ALWAYS return 200 within 1000ms
Onomondo has a **strict 1000ms timeout** and a circuit breaker that stops ALL webhook delivery after repeated failures. If the response is slow, devices silently stop reporting.

**Pattern**: Auth + validate + return 200 immediately. ALL processing in `after()`.
```
Request → Auth (sync) → Validate (sync) → Return 200 (~20ms)
                                            └→ after(): DB writes, geolocation, geocoding
```

#### 2. DB writes MUST succeed — geocoding can fail
`processLocationReport()` (creates LocationEvent) and `label.lastSeenAt` update are critical. Reverse geocoding (city name lookup) is non-critical. If you restructure the handler:
- **Sync or guaranteed**: LocationEvent creation, label updates, webhook log
- **Deferrable**: Geocoding, webhook log pruning

#### 3. Onomondo sends every webhook TWICE
In-memory dedup with 30-second window on `iccid:time` key. This fires before any processing.

#### 4. Use ICCID, never IMEI, for cell tower events
IMEI identifies the physical device. ICCID identifies the SIM. When a SIM moves to a different device, IMEI-based lookup routes to the wrong label. Always resolve labels by ICCID for Onomondo events.

#### 5. Accept both string AND numeric lat/lng
Onomondo's API sends coordinates as strings sometimes, numbers other times. The Zod schema uses `z.union([z.string(), z.number()]).transform(String)` to handle both.

#### 6. Accept ALL event types
Onomondo sends `location`, `network-registration`, `network-deregistration`, `usage`, etc. The `location` field is optional (only present on `location` type events). Non-location events still update `lastSeenAt` as heartbeats and can auto-promote PENDING → IN_TRANSIT shipments.

#### 7. Webhook logging uses retry + upsert fallback
If `createWebhookLog()` fails (Neon hiccup), the handler retries once, then uses `upsertWebhookLog()` at every exit path to guarantee the log is eventually persisted.

### "Last Update" Timestamp

This was the most-iterated bug. The correct logic:

```typescript
lastUpdate = Math.max(
  latestLocation?.recordedAt,   // Last location event time (device clock)
  label?.lastSeenAt              // Last webhook heartbeat time
)
```

- `recordedAt` = device-reported time (from webhook `time` field)
- `receivedAt` = server-received time (when our endpoint processed it)
- `lastSeenAt` = updated on EVERY webhook, even deduplicated ones
- UI uses `recordedAt` for location history, `lastSeenAt` for "device online" status

**Key rule**: When location events are deduplicated (same coordinates), `lastSeenAt` MUST still be updated so the "Last Update" column stays fresh.

### Location Event Deduplication

Current strategy: **5-minute exact coordinate dedup**. If the same label reports the identical lat/lng within 5 minutes, skip creating a new LocationEvent but still update `lastSeenAt`.

Previous attempts that failed:
- 30min/1km heuristic dedup — too aggressive for infrequent reporters (reverted)
- No dedup at all — too much noise from stationary devices

### Cell Tower Geolocation

When Onomondo provides coordinates, use them directly. Fallback chain:
1. Onomondo `location.lat/lng` (from their API)
2. Google Geolocation API via `resolveCellTowerLocation()` (100-200ms, 3s timeout)
3. Last known location for this device (heartbeat with stale coords)
4. Skip if no coordinates available

### Geocoding (Reverse)

Uses Nominatim for reverse geocoding (lat/lng → city name). Has rate limits (1 req/sec).
- Failed geocodes are retried by daily `backfill-geocode` cron (200 records/batch)
- Nominatim calls use retry-with-backoff (3 attempts, 1.5s/3s delays)
- Null island (0, 0) coordinates are rejected before geocoding

---

## Auth & Security

### Middleware (`proxy.ts`)
- `clerkMiddleware()` MUST always be registered globally, even in CI
- Gate behavior inside the middleware (early return if no keys), don't conditionally register it
- API routes skip proxy auth — they use `requireOrgAuth()` directly

### `canAccessRecord()` — Access Control
```typescript
// Correct pattern:
if (record.orgId) return record.orgId === context.orgId  // Org-scoped
return record.userId === context.user.id                  // Personal ownership
```
Never allow access just because `orgId` is null. Records without an org require explicit userId ownership check.

### Status Transitions — Use Allowlists
```
PENDING → IN_TRANSIT, CANCELLED
IN_TRANSIT → DELIVERED (only via confirm-delivery endpoint), CANCELLED
DELIVERED → (terminal, no transitions except admin reactivate)
CANCELLED → (terminal, release label back to SOLD)
```
Don't allow arbitrary status changes via PATCH. The `confirm-delivery` endpoint has required validation (notifications, timestamp).

### Label Claiming — Atomic Transaction
Use `$transaction` with `updateMany` WHERE clause to atomically clear the claim token. If `updateMany` returns 0 rows, another request won the race → return 409 Conflict.

---

## Stripe Integration

### Resilience Stack (defense in depth)
1. **Region pinning**: `export const preferredRegion = 'iad1'` on checkout + webhook routes (Stripe servers are US East)
2. **SDK config**: `maxNetworkRetries: 5`, `timeout: 45_000`
3. **App-level retry**: 2 attempts with exponential backoff, only for `StripeConnectionError`
4. **Diagnostic logging**: Log key prefix, region, retry count on failures

---

## Cron Jobs

All cron handlers use `withCronLogging()` wrapper from `lib/cron.ts` which:
- Validates `Authorization: Bearer {CRON_SECRET}`
- Logs execution to `CronExecutionLog` table (status, duration, metrics)
- Handles crashes gracefully

| Job | Schedule | Purpose |
|-----|----------|---------|
| `watchdog` | Daily 14:00 UTC | Health report: scheduler, jobs, shipments, data quality |
| `backfill-geocode` | Daily 13:00 UTC | Retry failed reverse geocoding (200 records/batch) |
| `check-signals` | Periodic | Alert if device silent >48 hours |
| `check-stuck` | Periodic | Alert if shipment location unchanged >48 hours |
| `cleanup-data` | Periodic | Prune old webhook logs (>7 days), cron logs (>30 days) |
| `check-unclaimed-labels` | Periodic | Reminder emails for unclaimed labels |
| `research-reminders` | Daily 07:30 UTC | Send 24h-before interview reminders |
| `research-followup` | Daily 09:30 UTC | Auto thank-you email after interview completion |
| `research-referral` | Daily 10:30 UTC | Referral request 48h after interview |
| `research-stale-leads` | Weekly Mon 09:00 UTC | Alert if leads stuck in CONTACTED >7 days |

### Stuck Shipment Detection
Must verify data actually spans 48 hours, not just that the query window is 48h. Compare oldest vs newest location timestamps in the result set.

---

## Database

- **Neon adapter**: Pass `{ connectionString }` (PoolConfig object) to `PrismaNeon`, NOT a `Pool` instance. The adapter manages its own connection pool.
- **Schema changes**: Use `prisma db push` (not `migrate dev`) to avoid schema drift
- **Production changes**: Pull env with `npx vercel env pull`, then `prisma db push` with prod DATABASE_URL

---

## UI Patterns

### Design System
- **Theme tokens**: Always use semantic tokens (`bg-card`, `text-foreground`, `border-border`), never hardcoded colors (`bg-gray-900`, `text-white`)
- **Shared components**: `FieldInfo` (tooltip helper text), `SectionCard` (form sections), `StatCard` (dashboard stats)
- **Mobile tooltips**: Desktop uses hover `Tooltip`, mobile uses tap `Popover` with dismiss button

### Sidebar Navigation
Both `sidebar-nav.tsx` AND `mobile-sidebar.tsx` must be updated together (dashboard and admin each have their own pair).

### Cargo Table
- Default sort: "Last Update" descending
- Delete refresh: Uses custom event dispatch, not `router.refresh()`
- Sortable columns with visual indicators

### Map Markers
- Sequential clustering groups nearby points (1km) into stops
- Post-processing merges revisited stops
- Current location shown as blue labeled dot
- Stop markers are plain blue dots (no dwell time labels — removed for simplicity)

### Client-Side Data Refresh
- Use custom events (dispatch/listen) instead of `router.refresh()` for client component re-fetches
- Auto-polling: Condition on data state (e.g., only poll when active shipments exist)
- Use `useRef` for interval management, `useCallback` for dependency stability

---

## CI/CD & E2E Tests

### Playwright in GitHub Actions
These rules were learned through 14 failed attempts:

1. **Use `127.0.0.1`, never `localhost`** — container DNS can't resolve localhost
2. **Use bundled headless-shell**, not system Chrome — system Chrome needs D-Bus which isn't available in CI
3. **Disable Chromium sandbox in CI** (`--no-sandbox`) — CI containers block sandbox syscalls
4. **Always register `clerkMiddleware()` globally** — even with dummy keys. Gate behavior inside, don't conditionally register
5. **Use properly formatted Clerk dummy key** — `pk_test_ZHVtbXkuZXhhbXBsZS5jb20k` (valid base64 format)
6. **Bind server to `0.0.0.0`** — `--hostname 0.0.0.0` for Next.js dev server

### Deployment
- Push to `main` triggers Vercel auto-deploy
- No staging environment — test thoroughly before pushing
- Vercel region pinning via `export const preferredRegion = 'iad1'` for latency-sensitive routes

---

## GDPR Compliance

- User data export (`/api/v1/user/export`) must include ALL personal data: shipments, cargo, devices, savedAddresses, notificationPreferences
- User deletion must cascade to all related records
- Unsubscribe endpoint validates tokens and handles already-unsubscribed state

---

## Common Pitfalls

1. **Don't await external APIs in webhook handlers** — Onomondo times out at 1000ms
2. **Don't use IMEI for cell tower lookups** — SIMs move between devices
3. **Don't hardcode colors** — use theme tokens for light/dark mode
4. **Don't use `router.refresh()`** for client component updates — use custom events
5. **Don't pass `Pool` instance to PrismaNeon** — pass PoolConfig object
6. **Don't conditionally register middleware** — always register, gate behavior inside
7. **Don't trust orgId=null means "allow"** — check userId ownership explicitly
8. **Don't allow direct PATCH to DELIVERED status** — must go through confirm-delivery endpoint
9. **Don't use `localhost` in CI** — use `127.0.0.1`
10. **Don't skip lastSeenAt update on deduped events** — "Last Update" will look stale

---

## Research Hub

Internal tool at `/admin/research` for managing user interviews across 3 personas (Consignee, Forwarder, Shipper).

### Structure
```
Pages:   app/src/app/(admin)/admin/research/       (dashboard, leads, scripts, interviews, insights, tasks, calendar)
API:     app/src/app/api/v1/admin/research/         (leads, scripts, hypotheses, interviews, tasks, insights, calendar, email)
Crons:   app/src/app/api/cron/research-*/           (reminders, followup, referral, stale-leads)
Components: app/src/components/admin/research/      (22 components)
Emails:  app/src/emails/research-*.tsx              (outreach, scheduled, reminder, thank-you, referral)
Seed:    app/prisma/seed-research-scripts.ts        (hypotheses + scripts)
         app/prisma/seed-research-demo.ts           (demo leads, interviews, tasks)
```

### Key Rules
- **Auth**: All research API routes use `requireAdmin()` — no org-scoped access, admin-only
- **CEO Review Workflow**: Script status transitions: DRAFT → IN_REVIEW → APPROVED (or back to DRAFT). Only APPROVED scripts can be used in the interview runner
- **Interview Runner**: Two-panel layout (script left, notes right). Structured notes per section, key quotes with themes, hypothesis signals (validating/neutral/invalidating). Auto-save every 30s. Completing an interview moves lead to COMPLETED
- **Hypothesis Signals**: Stored in `ResearchInterview.hypothesisSignals` as JSON array with `{ hypothesisId: "H1", signal, evidence }`. The `hypothesisId` field matches `ResearchHypothesis.code`, NOT the `id`
- **Auto-Created Tasks**: Interview completed → "Send gift card" + "Write summary" tasks. Script submitted → "Review script" task assigned to Andrii
- **Stale Lead Detection**: Leads in CONTACTED >7 days get yellow border warning. Weekly cron sends alert email
