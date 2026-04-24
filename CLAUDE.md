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

**Pattern**: Rate limit → Auth → Validate → Return 200 immediately. ALL processing in `after()`.
```
Request → Rate limit (120/min per key) → Auth → Zod validate → Return 200 (~20ms)
                                                                 └→ after():
                                                                     1. Update label.lastSeenAt (heartbeat)
                                                                     2. Auto-promote PENDING → IN_TRANSIT
                                                                     3. Resolve coordinates (fallback chain)
                                                                     4. processLocationReport() → LocationEvent
                                                                     5. Deferred geocoding (async)
                                                                     6. Upsert webhook log
                                                                     7. Probabilistic log pruning (5% chance)
```

**Auth**: Accepts `X-API-Key` header, `?key=` query param, or shared secret headers (`X-Onomondo-Webhook-Secret`, `X-Webhook-Secret`, `Authorization`). Checked against `ONOMONDO_WEBHOOK_API_KEY`, `ONOMONDO_CONNECTOR_API_KEY`, or `DEVICE_API_KEY` env vars.

#### 2. DB writes MUST succeed — geocoding can fail
`processLocationReport()` (creates LocationEvent) and `label.lastSeenAt` update are critical. Reverse geocoding (city name lookup) is non-critical. If you restructure the handler:
- **Sync or guaranteed**: LocationEvent creation, label updates, webhook log
- **Deferrable**: Geocoding, webhook log pruning

#### 3. Onomondo sends every webhook TWICE
Deterministic webhook log ID: `SHA256(onomondo:{iccid}:{time}:{type})[0:25]` — same payload always produces the same ID, so DB upsert naturally deduplicates at the webhook log level.

#### 4. Use ICCID, never IMEI, for cell tower events
IMEI identifies the physical device. ICCID identifies the SIM. When a SIM moves to a different device, IMEI-based lookup routes to the wrong label. Always resolve labels by ICCID for Onomondo events.

#### 5. Accept both string AND numeric lat/lng
Onomondo's API sends coordinates as strings sometimes, numbers other times. The Zod schema uses `z.union([z.string(), z.number()]).transform(String)` to handle both.

#### 6. Accept ALL event types
Onomondo sends `location`, `network-registration`, `network-deregistration`, `usage`, etc. The `location` field is optional (only present on `location` type events). Non-location events still update `lastSeenAt` as heartbeats and can auto-promote PENDING → IN_TRANSIT shipments.

#### 8. Webhook Payload Structure (validated in `lib/validations/device.ts`)
```
{ type, iccid, imei, sim_id, time, ipv4, session_id, sim_label,
  network: { name, country, country_code, mcc, mnc },
  network_type,  // radio hint: GSM, LTE, etc.
  location: {    // OPTIONAL — absent on non-location events
    cell_id, location_area_code, accuracy,
    lat, lng   // string OR number, can be null
  } }
```

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

### Location Event Deduplication (Multi-Layer)

Four layers of dedup, each catching what the previous missed:

| Layer | Scope | Mechanism |
|-------|-------|-----------|
| Webhook log ID | Onomondo double-sends | Deterministic SHA256 of `iccid:time:type` → same payload = same DB upsert |
| Exact coordinate dedup | Same label, same lat/lng within 5 min | Skips new LocationEvent, still updates `lastSeenAt` |
| Proximity dedup (cell tower only) | Same label, 3km radius within 60 min | Haversine distance — adjacent towers don't create new events |
| Velocity sanity check | Same label, impossible travel speed | Rejects events implying >1000 km/h (stale cell tower DB). Same-timestamp + >100m = rejected |
| DB unique constraint | Final safety net | `@@unique([labelId, recordedAt, lat, lng, source])` |

**Key rule**: ALL dedup layers still update `lastSeenAt` so "Last Update" stays fresh.

Previous attempts that failed:
- 30min/1km heuristic dedup — too aggressive for infrequent reporters (reverted)
- No dedup at all — too much noise from stationary devices

### Manufacturing Cooldown (24h)

When a label is physically built, the SIM activation triggers the first Onomondo event which auto-registers the label in our system (`processLocationReport()` → auto-register path). Events from the factory floor must NOT appear in the end user's location history.

**How it works**:
- Auto-registration sets `Label.manufacturedAt` (NOT `activatedAt`) to the current timestamp
- `processLocationReport()` checks `manufacturedAt` — if <24 hours old, the event is suppressed:
  - `lastSeenAt` is still updated (heartbeat stays alive)
  - No `LocationEvent` is created
  - No shipment status changes, orphan detection, or delivery checks run
- After 24 hours, events are processed normally
- `Label.activatedAt` is set by the user-facing activation flows — whichever fires first: cargo/shipment creation against a SOLD/INVENTORY label, the explicit `/api/v1/device/activate` endpoint, or the first location report from the field while the label has an active shipment. None of these run during auto-registration, so factory SIM events never stamp it.

**Key rules**:
1. **Never set `activatedAt` during auto-registration** — use `manufacturedAt`. `activatedAt` represents user-facing activation ("label entered service"), not factory SIM activation.
2. **The cooldown only applies to auto-registered labels** — labels created manually (SOLD inventory) don't have `manufacturedAt` set.
3. **`lastSeenAt` is still updated during cooldown** — the device appears online, but no location history is recorded.

### Cell Tower Geolocation

When Onomondo provides coordinates, use them directly. Fallback chain:
1. Onomondo `location.lat/lng` (from their API)
2. Google Geolocation API via `resolveCellTowerLocation()` (100-200ms, 3s timeout)
3. Last known location for this device (heartbeat with stale coords)
4. Skip if no coordinates available

### Geocoding (Reverse) — 3-Tier Cache

`lib/geocoding.ts` resolves lat/lng → city/area/country with a fallback chain:
1. **In-memory cache** — keyed by `{lat.toFixed(3)},{lng.toFixed(3)}`
2. **DB neighbor lookup** — finds nearby already-geocoded LocationEvents (±0.0005° ≈ 50m)
3. **Nominatim API** — OpenStreetMap reverse geocode (2s timeout, zoom 14 for suburb detail)

Additional rules:
- Failed geocodes are retried by daily `backfill-geocode` cron (200 records/batch)
- Nominatim calls use retry-with-backoff (3 attempts, 1.5s/3s delays)
- Null island (0, 0) coordinates are rejected before geocoding
- Geocoding is always deferred (`skipGeocode: true` in webhook, async call after LocationEvent creation)

### Location Report Processing (`lib/device-report.ts`)

`processLocationReport()` is the shared function that creates LocationEvents. Key behaviors:

#### Device Resolution (by priority)
1. By `deviceId` (most reliable)
2. By ICCID — preferred for cell tower events (SIMs move between devices)
3. By IMEI — fallback only

If no label found, **auto-registers** a new label (`TIP-001`, `TIP-002`, etc.) with status `INVENTORY` and `manufacturedAt = now()`. The 24h manufacturing cooldown then suppresses LocationEvent creation (see "Manufacturing Cooldown" section above). Label stays INVENTORY until admin bulk-register (`/api/v1/labels/register`) assigns it to an order → SOLD, then user activation → ACTIVE.

#### Orphaned Device Detection
If a label reports location but has no active shipment and status is `SOLD`:
- Sets label to `ACTIVE`, generates a `claimToken` (48h expiry)
- Sends notification to purchaser with claim link
- Tracks `firstUnlinkedReportAt` for monitoring

#### Auto-Delivery Detection
When `IN_TRANSIT`, checks if last 2+ locations (within 30 min) are all within **1500m** of destination. Generous threshold accounts for cell tower accuracy (500-1000m). Auto-sets `DELIVERED` and sends notifications.

#### Offline Sync Detection
If `recordedAt` is >5 min before `receivedAt`, marks event as `isOfflineSync` (buffered report from offline period). Shown in UI with "Synced" badge.

### Location History Display & Grouping

Timeline components (`shipment-timeline.tsx`, `public-timeline.tsx`) transform raw LocationEvents into a readable history:

#### Step 1: Time-Window Thinning (`lib/utils/location-display.ts`)
For long shipments, thin events to **one per 2-hour window**. Keeps the most recent event, then jumps back 2h+. Prevents timeline overwhelm from hourly cell reports.

#### Step 2: Consecutive City Grouping
Groups consecutive events by same city:
- If geocoded → group by `geocodedCity`
- If not geocoded → group by spatial proximity (< 500m / ~0.005°)

Result: collapsed entry like **"Berlin, Germany (x5)"** instead of 5 separate items.

#### Step 3: Expandable Area Sub-Grouping
On expand, events within a city group are further grouped by `geocodedArea` (suburb/neighborhood). This merges A→B→A→B cell tower jitter into clean area groups ordered by first appearance.

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
| `shipment-digest` | Daily 10:00 UTC | **One consolidated digest per user** — pending + silent + stuck + unused labels. Replaces the old `check-signals` / `check-stuck` / `check-reminders` trio |
| `cleanup-data` | Periodic | Prune old webhook logs (>7 days), cron logs (>30 days) |
| `check-unclaimed-labels` | Periodic | Reminder emails for unclaimed labels |
| `research-reminders` | Daily 07:30 UTC | Send 24h-before interview reminders |
| `research-followup` | Daily 09:30 UTC | Auto thank-you email after interview completion |
| `research-referral` | Daily 10:30 UTC | Referral request 48h after interview |
| `research-stale-leads` | Weekly Mon 09:00 UTC | Alert if leads stuck in CONTACTED >7 days |

### Shipment Status Digest (Apr 2026 rewrite)

`shipment-digest` (daily 10 UTC) replaces the three separate alert crons that used to hammer inboxes (check-signals 8am, check-stuck 9am, check-reminders 10am — each sending its own per-shipment email). The new model is **one email per user per day**, split into sections: "Awaiting first signal", "Silent recently", "Not moving", "Unused labels".

Key rules when touching this code:

1. **Per-shipment backoff via `Shipment.digestCount` + `Shipment.lastDigestAt`.** First digest when the threshold is hit; subsequent digests at +3d, +7d, +14d, then silent (total 4 sends max) until the underlying issue resolves.
2. **Counters reset on recovery** in `lib/device-report.ts`: PENDING→IN_TRANSIT transition, IN_TRANSIT→DELIVERED, and any new LocationEvent stored for an IN_TRANSIT shipment (meaningful movement/signal recovery — the proximity/velocity dedup above filters stationary noise so reaching the store path is a real signal).
3. **Per-user cadence via `User.digestCadence` enum** (`OFF` / `WEEKLY` / `DAILY`). `WEEKLY` only fires on Monday UTC. Staff accounts (email matches `isAdminEmail` / `ADMIN_EMAILS` env var) are stamped `OFF` by the Clerk webhook at user creation. Existing staff need a one-time backfill SQL.
4. **Stuck detection must verify duration**: compare oldest vs newest recordedAt in the 48h window, not just that the query window is 48h.
5. **Fresh-shipment grace**: shipments created <48h ago are never included. Prevents a just-created cargo from being nagged on its first cron cycle.
6. **24h per-user throttle**: even with per-shipment backoff, check `Notification` table for a recent `shipment_status_digest` row before sending (belt + braces).
7. **Critical events still fire immediately** and bypass the digest entirely: `shipment-delivered`, `label-activated`, `label-orphaned`, `low-battery`, `order-*`, `dispatch-*`.

The legacy per-alert send functions (`sendNoSignalNotification`, `sendShipmentStuckNotification`, `sendShareLinkReminderNotification`) and their email templates (`no-signal.tsx`, `shipment-stuck.tsx`, `pending-shipment-reminder.tsx`, `unused-labels-reminder.tsx`) have been **deleted**. They kept firing in production via cron schedules baked into pre-digest deployments — Vercel cron jobs are bound to a deployment ID at deploy time, so removing the routes from the new build wasn't enough; the old deployments had to be `vercel remove`d, and the functions deleted from `lib/notifications.ts` so they can't be reintroduced accidentally. The `User.notifyNoSignal` / `notifyShipmentStuck` schema columns are still there and untouched — kept as-is to avoid a migration; the notification-preferences UI still toggles them but nothing reads them anymore. Remove the columns + UI rows in a follow-up.

---

## Database

- **Neon adapter**: Pass `{ connectionString }` (PoolConfig object) to `PrismaNeon`, NOT a `Pool` instance. The adapter manages its own connection pool.
- **Schema changes**: Use `prisma db push` (not `migrate dev`) to avoid schema drift
- **Production changes**: Pull env with `npx vercel env pull`, then `prisma db push` with prod DATABASE_URL

### Never Delete Production Data

**NEVER use `deleteMany` or `delete` on LocationEvent (or any tracking data) in production.** Always soft-exclude by setting a reason field. This preserves the audit trail and allows reversal.

- `LocationEvent.excludedReason` — nullable `String`. `null` = valid, any value = excluded.
- User-facing queries MUST filter with `excludedReason: null`. Use the `VALID_LOCATION` constant from `@/lib/db`:
  ```typescript
  import { db, VALID_LOCATION } from '@/lib/db'
  // Direct query:
  db.locationEvent.findMany({ where: { ...VALID_LOCATION, shipmentId } })
  // Relation include:
  include: { locations: { where: { ...VALID_LOCATION, source: 'CELL_TOWER' } } }
  ```
- Internal/dedup queries (device-report.ts, geocoding, admin diagnostics) must NOT use this filter — they need to see all events.
- Cleanup scripts (`scripts/cleanup-teleportation.ts`) use `updateMany` to set `excludedReason`, never `deleteMany`.
- Known exclusion reasons: `"teleportation"` (impossible travel speed from stale cell tower mapping).

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
11. **Don't set `activatedAt` or `status=ACTIVE` during auto-registration** — use `manufacturedAt` and `status=INVENTORY`. Factory labels stay INVENTORY until admin bulk-register promotes them to SOLD, then user activation (QR / cargo / first in-the-wild signal under an active shipment) promotes to ACTIVE. `activatedAt` is for user-facing activation ("label entered service"), not factory SIM activation
12. **Don't create LocationEvents during manufacturing cooldown** — first 24h after auto-registration are factory events; `lastSeenAt` heartbeat still updates
13. **Don't delete LocationEvents from the DB** — soft-exclude by setting `excludedReason`. Use `VALID_LOCATION` filter from `@/lib/db` in all user-facing queries
14. **Don't forget `VALID_LOCATION` filter on new LocationEvent queries** — omitting it leaks excluded (bogus) events into the UI

---

## First-Impression Journey (Onboarding Model)

**The mental model is non-obvious and is the source of most onboarding bugs:**

TIP holds labels in a warehouse and physically dispatches them to wherever the user says. **Users do NOT receive labels at their own address by default.** Label Dispatch (`LABEL_DISPATCH` shipment type) is **step 2 of onboarding**, not an advanced feature. The canonical flow is:

```
1. Buy labels → 2. Dispatch labels → 3. Receive + activate → 4. Track cargo
```

Receivers are often not the buyer, and the buyer often doesn't know the receiver's address yet. The dispatch form has an **"I don't know these details yet — I'll ask the receiver"** toggle that creates a blank dispatch and gives the buyer a public share link. The receiver fills in their own details via `/track/[shareCode]` with no Clerk auth.

### The 6 phases (resolved by `lib/user-phase.ts`)

| Phase | Condition | Active step |
|---|---|---|
| 0 | No orders | 1 — Buy Labels |
| 1 | Order:PAID, undispatched labels | 2 — "Where should we send your labels?" |
| 1b | LABEL_DISPATCH PENDING with `addressSubmittedAt == null` | 2 — Awaiting receiver details |
| 2 | LABEL_DISPATCH PENDING (with details) or IN_TRANSIT | 2 — In transit to receiver |
| 3 | LABEL_DISPATCH DELIVERED, no CARGO_TRACKING yet | 3 — Activate + attach |
| 4 | CARGO_TRACKING PENDING with no LocationEvent | 4 — Waiting for first signal |
| 5 | Active CARGO_TRACKING with reports | Journey card hidden |

`resolveUserPhase({ userId, orgId })` is the single source of truth — called once on `/dashboard`. The journey card (`components/dashboard/journey-card.tsx`) renders the 4-step timeline with phase-specific content for the active step.

### Critical rules

1. **Never assume the user has labels in hand.** Copy like "Stick a label on your cargo" or "Scan the QR or select a label" is wrong as a step-2 instruction. Labels are at TIP's warehouse until physically dispatched.
2. **Never filter dashboard shipment queries to `type: 'CARGO_TRACKING'`** — dispatches must appear on the dashboard map and active list.
3. **`/api/v1/labels?status=SOLD` filters out warehouse-resident labels** — only returns `ACTIVE` labels OR `SOLD` labels whose dispatch is `DELIVERED`. Don't reintroduce warehouse-label leakage.
4. **`Shipment.shareCode` works for both shipment types.** Reuse the existing `/track/[code]` route for `LABEL_DISPATCH` — do not build a parallel `/d/[code]` flow.
5. **Receiver-fill expiry**: blank dispatches get `shareLinkExpiresAt = createdAt + 14 days`. Public GET returns 410 past expiry. `check-stale-dispatches` cron sends reminder on day 7 and auto-cancels on day 14.
6. **`sendDispatchDetailsSubmitted`** must always fire when receiver completes the form — it's the only "unauthorized change detection" signal. Non-optional.
7. **Receiver name is split** into `Shipment.receiverFirstName` + `receiverLastName`. The submit-address handler concatenates into legacy `destinationName` for backwards compatibility.
8. **`Label.activatedAt`** is stamped by the earliest of: cargo/shipment creation against a SOLD/INVENTORY label (`cargo/route.ts`, `shipments/route.ts`), the explicit `/api/v1/device/activate` endpoint, or the first location report while the label has an active shipment (`device-report.ts`). Think of it as "label entered service" — it can precede any signal, so a label with `activatedAt` set but zero `LocationEvent` rows is expected state, not a bug.
9. **"New Shipment" dropdown** order is phase-dependent: Dispatch first for phases 0-2, Track Cargo first for phases 3+. Never lock to one order.

### Schema additions (April 2026)

- `Shipment.receiverFirstName`, `Shipment.receiverLastName`, `Shipment.shareLinkExpiresAt`
- `OrgSettings.defaultDispatchAddressId` → `SavedAddress.id` (UI to set this is not yet built)
- `Label.manufacturedAt` — set during auto-registration (SIM first event from factory); drives 24h manufacturing cooldown

### Site content needing a copy pass

The dashboard onboarding was fixed but **external pages and emails still describe the product as if the user already has labels in hand.** See the dedicated plan in `docs/site-content-update-plan.md` for the full audit + suggested copy.

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
