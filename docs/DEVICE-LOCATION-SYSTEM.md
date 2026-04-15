# Device Location System

Technical documentation for TIP's IoT location tracking pipeline: how device location data flows from Onomondo SIM webhooks through processing, deduplication, geocoding, and into the user-facing timeline.

---

## Architecture Overview

```
Onomondo SIM Platform
  │
  ▼ (webhook, every cell tower change)
POST /api/v1/device/onomondo/location-update
  │
  ├─ Rate limit (120/min per key)
  ├─ Auth (API key or shared secret)
  ├─ Zod validation
  ├─ Return 200 (~20ms)
  │
  └─ after() background processing:
       ├─ 1. Heartbeat: update label.lastSeenAt
       ├─ 2. Auto-promote PENDING → IN_TRANSIT
       ├─ 3. Resolve coordinates (fallback chain)
       ├─ 4. processLocationReport() → LocationEvent
       ├─ 5. Deferred geocoding (async)
       ├─ 6. Upsert webhook log
       └─ 7. Probabilistic log pruning (5%)
```

---

## Onomondo Webhook

### Event Types

Onomondo fires a webhook on every cell tower change (not just periodic reports). The `type` field indicates the event:

| Type | Has Location? | Description |
|------|:---:|-------------|
| `location` | Yes | Cell tower location update |
| `network-registration` | No | Device connected to network |
| `network-deregistration` | No | Device disconnected |
| `usage` | No | Data usage event |

All event types update `label.lastSeenAt` (heartbeat). Only events with coordinates create `LocationEvent` records.

### Payload Schema

Validated by `onomondoLocationUpdateSchema` in `lib/validations/device.ts`.

```json
{
  "type": "location",
  "iccid": "8945020000001234567",
  "imei": "356789012345678",
  "sim_id": 12345,
  "time": "2026-03-30T12:00:00.000Z",
  "ipv4": "10.0.0.1",
  "session_id": "abc123",
  "sim_label": "TIP-001",
  "network_type": "LTE",
  "network": {
    "name": "Vodafone",
    "country": "Germany",
    "country_code": "DE",
    "mcc": "262",
    "mnc": "02"
  },
  "location": {
    "cell_id": 12345,
    "location_area_code": 678,
    "accuracy": 500,
    "lat": "52.5200",
    "lng": "13.4050"
  }
}
```

**Important quirks:**
- `lat`/`lng` can be **string or number** — schema uses `z.union([z.string(), z.number()]).transform(String)`
- `location` is **optional** — absent on non-location event types
- `lat`/`lng` can be **null** even when `location` object is present
- Onomondo sends **every webhook twice** (identical payload, seconds apart)

### Authentication

The handler accepts any of these (checked against `ONOMONDO_WEBHOOK_API_KEY`, `ONOMONDO_CONNECTOR_API_KEY`, or `DEVICE_API_KEY` env vars):

| Method | Header/Param |
|--------|-------------|
| API Key header | `X-API-Key: <key>` |
| Query parameter | `?key=<key>` |
| Shared secret | `X-Onomondo-Webhook-Secret`, `X-Webhook-Secret`, or `Authorization` header |

### Critical Constraint: 1000ms Timeout

Onomondo enforces a strict 1000ms response timeout with a circuit breaker. If the handler is slow, Onomondo stops **ALL** webhook delivery. The handler returns 200 within ~20ms. All processing happens in the `after()` callback.

---

## Coordinate Resolution

When coordinates aren't provided (or are null), a fallback chain resolves them:

| Priority | Source | Latency | Notes |
|:---:|--------|---------|-------|
| 1 | Onomondo `location.lat/lng` | 0ms | Preferred, from their API |
| 2 | Google Geolocation API | 100-200ms (3s timeout) | Cell tower → coords; cached by `mcc:mnc:lac:cid` |
| 3 | Last known location cache | 0ms | From `label.lastLatitude/lastLongitude`; marked as cached |
| 4 | Skip | — | No coordinates available; webhook log records skip reason |

The Google Geolocation API (`lib/cell-geolocation.ts`) accepts MCC, MNC, LAC, Cell ID, and radio type. Results are cached in-memory because cell towers don't move. Both successful resolutions and nulls are cached to avoid repeated API calls.

---

## Location Report Processing

`processLocationReport()` in `lib/device-report.ts` is the shared function that creates `LocationEvent` records.

### Device Resolution

Labels are resolved from the webhook payload in priority order:

1. **By `deviceId`** — most reliable, direct DB lookup
2. **By ICCID** — preferred for Onomondo events (SIMs move between devices; IMEI would route to the wrong label)
3. **By IMEI** — fallback only

If no label found, **auto-registers** a new one (see below).

**IMEI vs ICCID priority twist:** If IMEI matches a label but that label has **no active shipment**, the system continues checking ICCID. The ICCID-matched label wins if it has an active shipment — because SIM cards (ICCID) are more reliable identifiers than physical devices (IMEI) when SIMs get swapped between devices.

### Auto-Registration of New Labels

When a device reports in and no existing label matches any of the three lookup strategies, the system automatically creates a new label. This happens when:

1. The webhook contains an **IMEI or ICCID** identifier
2. **No label was found** by deviceId, IMEI, or ICCID lookups
3. The webhook has **valid coordinates** (passed validation, not null island)

#### What Gets Created

```
Label {
  deviceId:       "TIP-XXX"        // sequential ID (see below)
  counter:        <atomic counter> // monotonic integer for display ID
  displayId:      "NNNNNyyyy"     // 5-digit counter + last 4 of IMEI (if available)
  imei:           <from webhook>   // or null if not provided
  iccid:          <from webhook>   // or null if not provided
  status:         ACTIVE
  manufacturedAt: <current time>   // NOT activatedAt — triggers 24h cooldown
}
```

The new label is **unowned** — not linked to any user, org, or shipment. It becomes available in the admin labels inventory. Setting `manufacturedAt` (not `activatedAt`) triggers the **24-hour manufacturing cooldown** — see below.

#### Sequential Device ID Generation

The `generateNextDeviceId()` function creates the next `TIP-XXX` identifier:

1. Query the DB for the **highest existing** `TIP-XXX` deviceId (lexicographic sort)
2. Extract the numeric part and **increment by 1**
3. **Zero-pad to 3 digits** (e.g., `TIP-001`, `TIP-042`, `TIP-123`)

Example: if `TIP-042` is the highest in the DB → next auto-registered label gets `TIP-043`.

#### Display ID Format

In addition to the internal `TIP-XXX` device ID, labels get a user-facing `displayId` in `NNNNNYYYY` format:

- **NNNNN**: 5-digit zero-padded counter (allocated atomically via `allocateNextCounter()`)
- **YYYY**: last 4 digits of the IMEI (if known at registration time)

Example: counter 7, IMEI `356789012345678` → displayId `000075678`.

#### Post-Registration: Onomondo Sync

If the webhook includes an **ICCID**, the system fires a **fire-and-forget** call to `syncSimLabelToOnomondo()`. This updates the SIM's label in the Onomondo dashboard to match the new `TIP-XXX` ID, so operators can identify the device in both systems.

#### What Happens Next

After auto-registration, the **manufacturing cooldown** suppresses `LocationEvent` creation for 24 hours (see next section). After the cooldown:
- `LocationEvent` records are created and linked to the label
- `lastSeenAt` is updated
- If the label later gets linked to a shipment, all prior orphaned `LocationEvent` records are **backfilled** with the `shipmentId`

If the label is later purchased (status set to `SOLD`) and starts reporting without a shipment, the **orphaned device detection** kicks in (see below).

#### Legacy Label Backfill

When a webhook arrives for a label that lacks a `displayId` (pre-existing labels created before the display ID format was introduced), the system backfills it:

1. If the label already has a `counter` → compute `displayId` from `counter + IMEI`
2. If the label has no `counter` (e.g., `TIP-016` from early inventory) → atomically allocate one via `$transaction` + `allocateNextCounter()`, then compute `displayId`

This ensures all labels gradually acquire display IDs as they report in, without requiring a migration.

### Manufacturing Cooldown (24 hours)

When a label is physically built, SIM activation triggers Onomondo events from the factory floor. These must not appear in the end user's tracking history.

**How it works:**

1. Auto-registration sets `Label.manufacturedAt` (not `activatedAt`) to the current timestamp
2. `processLocationReport()` checks `manufacturedAt` — if <24 hours old, the event is **suppressed**:
   - `lastSeenAt` is still updated (heartbeat stays alive)
   - **No `LocationEvent` is created**
   - No shipment status changes, orphan detection, or delivery checks run
3. After 24 hours, events are processed normally
4. `Label.activatedAt` is set by one of the user-facing activation flows — whichever fires first: cargo/shipment creation against a SOLD/INVENTORY label, the explicit `/api/v1/device/activate` endpoint, or the first location report from the field while the label has an active shipment. None of these run during auto-registration.

**Key rules:**
- Never set `activatedAt` during auto-registration — use `manufacturedAt`
- The cooldown only applies to auto-registered labels (labels created manually as `SOLD` inventory don't have `manufacturedAt` set)
- `lastSeenAt` is still updated during cooldown — the device appears online, but no location history is recorded

### Deduplication (5 Layers)

| Layer | What It Catches | Mechanism |
|-------|----------------|-----------|
| **Webhook log ID** | Onomondo double-sends | Deterministic `SHA256(onomondo:{iccid}:{time}:{type})[0:25]` — same payload = same DB upsert |
| **Exact coordinate dedup** | Same location within 5 min | Query: same `labelId`, `lat`, `lng`, `source`, `recordedAt >= now - 5min` |
| **Proximity dedup** | Adjacent cell towers (cell tower source only) | Haversine distance < 3km within 60 min window |
| **Velocity sanity check** | Impossible travel speed (stale cell tower DB) | Rejects events implying >1000 km/h. Same-timestamp + >100m distance = rejected (infinite speed) |
| **DB unique constraint** | Final safety net | `@@unique([labelId, recordedAt, lat, lng, source])` |

**All layers still update `label.lastSeenAt`** so the "Last Update" column stays fresh even when the location event itself is deduplicated.

### LocationEvent Fields

```
labelId, shipmentId
latitude, longitude, accuracyM
altitude, speed, batteryPct
recordedAt        — device-reported time (from webhook `time`)
receivedAt        — server time (when processed)
isOfflineSync     — true if recordedAt is >5min before receivedAt
cellLatitude, cellLongitude  — raw cell tower coords
source            — 'GPS' or 'CELL_TOWER'
eventType         — Onomondo event type string
geocodedCity, geocodedArea, geocodedCountry, geocodedCountryCode
```

### Automatic Status Transitions

**PENDING → IN_TRANSIT:** Triggered on the first location event after shipment creation. Sends type-specific notifications:
- **CARGO_TRACKING**: Consignee in-transit email (if consignee email provided)
- **LABEL_DISPATCH**: Dispatch buyer notification ("Your TIP labels are on their way")

**IN_TRANSIT → DELIVERED:** Checks if the last 2+ locations (within 30 min) are all within 1500m of the destination address. The generous threshold accounts for cell tower accuracy (500-1000m). Auto-sets `deliveredAt` and sends type-specific notifications:
- **CARGO_TRACKING**: Shipper + consignee delivery notifications
- **LABEL_DISPATCH**: Dispatch delivered notification ("Your TIP labels have arrived, time to activate")

**LABEL_DISPATCH delivery** is detected both inline in `processLocationReport()` and via the `check-delivery` cron job. The cron aggregates locations from **all linked labels** (via `shipmentLabels` join table) for multi-label dispatches.

**Order cascade:** When a `LABEL_DISPATCH` is delivered and belongs to an order, `maybeCompleteOrder()` checks if all dispatches in the order are now delivered. If so, the order is marked `DELIVERED` and an order-delivered email is sent.

**`activatedAt` stamping:** Marks the moment a label enters service. Set by the earliest of:

1. **Cargo shipment creation** — `cargo/route.ts` stamps `activatedAt` (and promotes SOLD/INVENTORY → ACTIVE) when a cargo shipment is linked to the label
2. **Generic shipment creation** — `shipments/route.ts` does the same for the generic shipment path
3. **Explicit activation** — `/api/v1/device/activate` (QR-scan flow) sets `activatedAt` and status ACTIVE directly
4. **First location report** — `device-report.ts` stamps it when the label reports from the field and has any active shipment (cargo or dispatch), independent of whether a cargo shipment was pre-created

Paths 1–3 can stamp `activatedAt` **before any LocationEvent exists** — a label with `activatedAt` set and zero events is expected when the user has committed the label to service but the device hasn't pinged yet. Orphaned SOLD labels (no active shipment) never reach path 4 — they go through the claim-token flow instead.

### Orphaned Device Detection

If a label reports location but has no active shipment, no existing claim token, and its status is `SOLD`:
- Label status is **kept as `SOLD`** (not promoted to ACTIVE — keeps the label in the "available labels" dropdown for cargo creation)
- A `claimToken` is generated (48h expiry)
- Notification sent to the purchaser with a claim link
- `firstUnlinkedReportAt` is tracked for monitoring

The SOLD → ACTIVE promotion happens later when the user creates a cargo shipment with this label.

### Offline Sync Detection

If `recordedAt` is >5 minutes before `receivedAt`, the event is marked `isOfflineSync = true`. This means the device buffered reports while offline and sent them in a batch when reconnected. Shown in UI with a "Synced" badge.

---

## Reverse Geocoding

Converts lat/lng coordinates into human-readable location names (city, area, country).

### 3-Tier Cache (`lib/geocoding.ts`)

| Tier | Speed | Mechanism |
|------|-------|-----------|
| **In-memory cache** | Instant | Map keyed by `{lat.toFixed(3)},{lng.toFixed(3)}` |
| **DB neighbor lookup** | Fast | Nearby already-geocoded `LocationEvent` within +-0.0005 deg (~50m) |
| **Nominatim API** | 1-2s | OpenStreetMap reverse geocode (zoom 14, suburb detail) |

### Result Fields

```
geocodedCity          — city, town, or village name
geocodedArea          — suburb, neighbourhood, or borough
geocodedCountry       — country name
geocodedCountryCode   — ISO 3166-1 alpha-2 (e.g., "DE")
```

### Failure Handling

- Geocoding is always **deferred** — the webhook creates the `LocationEvent` first, then geocodes async
- Failed geocodes are retried by the daily `backfill-geocode` cron job (200 records/batch)
- Nominatim calls use retry-with-backoff (3 attempts, 1.5s/3s delays)
- Null island (0, 0) coordinates are rejected before geocoding

---

## Location History Display

Timeline components transform raw `LocationEvent` records into a readable history. Two variants exist:

- **`shipment-timeline.tsx`** — internal dashboard (authenticated users)
- **`public-timeline.tsx`** — public tracking page (simpler grouping)

### Step 1: Time-Window Thinning

For long shipments with hourly cell tower reports, events are thinned to **one per 2-hour window**.

```
[12:00, 11:30, 11:00, 10:30, 10:00, 9:30, 9:00, 8:30, 8:00]
                      ↓ thin to 2h windows
[12:00, 10:00, 8:00]
```

Keeps the most recent event, then skips to the next event >2h in the past. Prevents timeline overwhelm.

### Step 2: Consecutive City Grouping

Events are grouped into timeline entries by **consecutive same-city** runs:

- If geocoded → group by `geocodedCity` match
- If not geocoded → group by spatial proximity (< 500m / ~0.005 deg)

**Result:** A collapsed entry like **"Berlin, Germany (x5)"** instead of 5 separate dots.

### Step 3: Expandable Area Sub-Grouping

When a user expands a city group, events are further grouped by `geocodedArea` (suburb/neighbourhood level). This merges A->B->A->B cell tower jitter into clean area groups, ordered by first appearance.

```
Berlin, Germany (x5)
  └─ expand:
     ├─ Mitte, Berlin (x3)
     └─ Kreuzberg, Berlin (x2)
```

### Map Visualization

- Sequential clustering groups nearby points (1km) into stops
- Post-processing merges revisited stops
- Current location shown as blue labeled dot
- Stop markers are plain blue dots (no dwell time labels)

---

## "Last Update" Timestamp

The most-iterated bug in the codebase. The correct logic:

```typescript
lastUpdate = Math.max(
  latestLocation?.recordedAt,   // last location event time (device clock)
  label?.lastSeenAt              // last webhook heartbeat time
)
```

| Field | Source | Updated When |
|-------|--------|-------------|
| `recordedAt` | Device clock (webhook `time` field) | New LocationEvent created |
| `receivedAt` | Server clock | New LocationEvent created |
| `lastSeenAt` | Server clock | **Every webhook**, including deduped and non-location events |

The UI uses `recordedAt` for location history timestamps and `lastSeenAt` for "device online" / "Last Update" status.

---

## Cron Jobs (Location-Related)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `backfill-geocode` | Daily 13:00 UTC | Retry failed reverse geocoding (200 records/batch) |
| `check-delivery` | Periodic | Auto-detect delivery for both CARGO_TRACKING (single label) and LABEL_DISPATCH (multi-label via shipmentLabels). Cascades order completion |
| `check-signals` | Periodic | Alert if device silent >48 hours |
| `check-stuck` | Periodic | Alert if shipment location unchanged >48 hours |
| `cleanup-data` | Periodic | Prune webhook logs >7 days, cron logs >30 days |

### Stuck Shipment Detection

Must verify data actually **spans** 48 hours, not just that the query window is 48h. Compare oldest vs newest location timestamps in the result set.

---

## Key Files

| File | Purpose |
|------|---------|
| `app/src/app/api/v1/device/onomondo/location-update/route.ts` | Webhook handler: auth, validate, return 200, process in `after()` |
| `app/src/lib/device-report.ts` | Shared location processing: device resolution, dedup, status transitions |
| `app/src/lib/cell-geolocation.ts` | Google Geolocation API client (cell tower -> coords), in-memory cache |
| `app/src/lib/geocoding.ts` | Reverse geocoding: 3-tier cache (memory, DB, Nominatim) |
| `app/src/lib/validations/device.ts` | Zod schemas: `onomondoLocationUpdateSchema` |
| `app/src/lib/label-id.ts` | Display ID format: `allocateNextCounter()`, `formatDisplayId()` |
| `app/src/lib/order-utils.ts` | Order completion cascade: `maybeCompleteOrder()` |
| `app/src/app/api/cron/check-delivery/route.ts` | Delivery detection cron: geofence check for CARGO_TRACKING + LABEL_DISPATCH |
| `app/src/lib/utils/location-display.ts` | Display utilities: time-window thinning, location name formatting |
| `app/src/components/shipments/shipment-timeline.tsx` | Internal timeline: city grouping + area sub-grouping |
| `app/src/components/tracking/public-timeline.tsx` | Public tracking timeline |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|:---:|---------|
| `ONOMONDO_WEBHOOK_API_KEY` | Yes | Primary webhook auth key |
| `ONOMONDO_CONNECTOR_API_KEY` | No | Secondary auth key (Onomondo Connector) |
| `DEVICE_API_KEY` | No | Legacy device API key |
| `GOOGLE_GEOLOCATION_API_KEY` | Yes | Cell tower → coordinates fallback |
| `ONOMONDO_API_KEY` | No | Onomondo management API (SIM label sync) |
