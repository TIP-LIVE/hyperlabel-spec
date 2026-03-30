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

If no label found, **auto-registers** a new one with sequential ID (`TIP-001`, `TIP-002`, ...) and status `ACTIVE`.

### Deduplication (4 Layers)

| Layer | What It Catches | Mechanism |
|-------|----------------|-----------|
| **Webhook log ID** | Onomondo double-sends | Deterministic `SHA256(onomondo:{iccid}:{time}:{type})[0:25]` — same payload = same DB upsert |
| **Exact coordinate dedup** | Same location within 5 min | Query: same `labelId`, `lat`, `lng`, `source`, `recordedAt >= now - 5min` |
| **Proximity dedup** | Adjacent cell towers (cell tower source only) | Haversine distance < 3km within 60 min window |
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

**PENDING → IN_TRANSIT:** Triggered on the first location event after shipment creation. Sends consignee notification.

**IN_TRANSIT → DELIVERED:** Checks if the last 2+ locations (within 30 min) are all within 1500m of the destination address. The generous threshold accounts for cell tower accuracy (500-1000m). Auto-sets `deliveredAt` and sends delivery notifications to shipper + consignee.

### Orphaned Device Detection

If a label reports location but has no active shipment and its status is `SOLD`:
- Label is set to `ACTIVE`
- A `claimToken` is generated (48h expiry)
- Notification sent to the purchaser with a claim link
- `firstUnlinkedReportAt` is tracked for monitoring

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
