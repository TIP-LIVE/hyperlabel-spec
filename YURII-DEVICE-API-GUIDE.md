# TIP Device API — Developer Onboarding Guide

**For:** Yurii (yurii@tip.live)
**Project:** tip-live-platform (Google Cloud)
**Mission:** Migrate the device tracking API from `label.utec.ua` to TIP's own GCP infrastructure

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Your Mission](#2-your-mission)
3. [Data Flow](#3-data-flow)
4. [API Contract — What TIP Expects](#4-api-contract--what-tip-expects)
5. [What TIP Does With Device Data](#5-what-tip-does-with-device-data)
6. [Database Schema Reference](#6-database-schema-reference)
7. [Hardware Data Format](#7-hardware-data-format-from-onomondo)
8. [Recommended GCP Architecture](#8-recommended-gcp-architecture)
9. [GCP Access & Getting Started](#9-gcp-access--getting-started)
10. [Testing Against Live TIP](#10-testing-against-live-tip)
11. [Deployment Workflow](#11-deployment-workflow)
12. [Key Contacts & Resources](#12-key-contacts--resources)

---

## 1. Architecture Overview

TIP is a door-to-door cargo tracking platform. Physical tracking labels (with GPS + cellular) are attached to cargo and transmit location data as the shipment moves.

### Current Architecture (Before You)

```
Hardware Label (GPS + Onomondo SIM)
        │
        ▼
┌──────────────────────────┐
│   label.utec.ua          │  ← Andrii's existing backend
│   (External, 3rd party)  │     Receives raw device data
│   FastAPI / Python        │     Stores device history
└──────────┬───────────────┘
           │ Webhook / API call
           ▼
┌──────────────────────────┐
│   TIP Backend            │  ← Our Next.js app on Vercel
│   tip.live               │     Business logic, tracking UI
│   POST /api/v1/device/   │     Shipment state management
│     report               │     Delivery detection
└──────────────────────────┘
```

### Target Architecture (After You)

```
Hardware Label (GPS + Onomondo SIM)
        │
        ▼
┌──────────────────────────┐
│   GCP Cloud Run          │  ← YOUR SERVICE
│   device-api.tip.live    │     Replaces label.utec.ua
│   (tip-live-platform)    │     Receives raw device data
│                          │     Transforms & forwards to TIP
└──────────┬───────────────┘
           │ HTTP POST
           ▼
┌──────────────────────────┐
│   TIP Backend            │  ← Unchanged
│   tip.live               │     Same API contract
│   POST /api/v1/device/   │
│     report               │
└──────────────────────────┘
```

---

## 2. Your Mission

Build a **Cloud Run service** that:

1. **Receives** raw location data from hardware labels via Onomondo webhooks (HTTP)
2. **Validates & transforms** the data into the format TIP expects
3. **Forwards** each location report to `POST https://tip.live/api/v1/device/report`
4. **Stores** raw device data for debugging / history (optional but recommended)
5. **Handles** offline queue sync — devices can cache data and send batches when connectivity returns

### What You DON'T Need to Build
- The TIP web app (already built and deployed)
- Shipment management, delivery detection, notifications (TIP handles this)
- User authentication UI (TIP uses Clerk)
- Payment/billing (TIP uses Stripe)

---

## 3. Data Flow

```
Step 1: Hardware label powers on (tab pulled)
        └─ GPS module acquires fix
        └─ Cellular module connects via Onomondo SIM

Step 2: Label sends location data every ~10 minutes
        └─ HTTP POST to Onomondo connector endpoint
        └─ Onomondo forwards to YOUR Cloud Run webhook URL

Step 3: Your Cloud Run service receives the data
        └─ Validates coordinates (reject 0,0 / NaN / out of range)
        └─ Transforms from Onomondo format → TIP format
        └─ Forwards to TIP: POST https://tip.live/api/v1/device/report

Step 4: TIP processes the report
        └─ Stores LocationEvent in PostgreSQL
        └─ Updates label battery level
        └─ Auto-transitions PENDING → IN_TRANSIT on first report
        └─ Detects delivery (geofence: 100m radius, 30min dwell)
        └─ Sends email notifications to shipper & consignee
```

---

## 4. API Contract — What TIP Expects

### Endpoint

```
POST https://tip.live/api/v1/device/report
```

### Authentication

```
Header: X-API-Key: <DEVICE_API_KEY>
```

The API key will be provided to you. You can also use query param `?key=<DEVICE_API_KEY>`.

### Rate Limit

120 requests per minute per API key.

### Request Body (JSON)

```json
{
  "deviceId": "HL-001234",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "accuracy": 15,
  "altitude": 45.2,
  "speed": 0.5,
  "battery": 87,
  "recordedAt": "2026-02-09T12:00:00.000Z",
  "cellLatitude": 51.5080,
  "cellLongitude": -0.1280,
  "isOfflineSync": false
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceId` | string | **Yes** | Device identifier, e.g. `"HL-001234"`. Must match a Label record in TIP's database. |
| `latitude` | number | **Yes** | GPS latitude, -90 to 90 |
| `longitude` | number | **Yes** | GPS longitude, -180 to 180 |
| `accuracy` | number | No | GPS accuracy in meters (positive) |
| `altitude` | number | No | Altitude in meters |
| `speed` | number | No | Speed in m/s (>= 0) |
| `battery` | number | No | Battery percentage, 0-100 |
| `recordedAt` | string | No | ISO 8601 datetime when the device recorded the location. If omitted, TIP uses server receive time. |
| `cellLatitude` | number | No | Cell tower triangulation latitude (Onomondo backup), -90 to 90 |
| `cellLongitude` | number | No | Cell tower triangulation longitude, -180 to 180 |
| `isOfflineSync` | boolean | No | Set to `true` if this data was cached offline and synced later. Defaults to `false`. |

### Validation Rules

- `latitude === 0 && longitude === 0` → **Rejected** (null island)
- Coordinates outside valid ranges → **Rejected**
- `NaN` or `Infinity` → **Rejected**
- Empty `deviceId` → **Rejected**

### Successful Response (200)

```json
{
  "success": true,
  "locationId": "cm4abc123def456",
  "shipmentId": "cm4xyz789ghi012"
}
```

`shipmentId` will be `null` if no active shipment is linked to this label.

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Validation failed", "details": {...} }` | Invalid request body |
| 400 | `{ "error": "Invalid coordinates" }` | Null island or out of range |
| 401 | `{ "error": "Invalid API key" }` | Wrong or missing API key |
| 404 | `{ "error": "Device not found" }` | deviceId doesn't match any Label |
| 429 | `{ "error": "Rate limit exceeded" }` | Too many requests |
| 500 | `{ "error": "Internal server error" }` | Server error |

---

## 5. What TIP Does With Device Data

When your service sends a report to TIP, here's what happens:

### 5a. Location Storage
Every valid report creates a `LocationEvent` record in PostgreSQL (Neon, EU-west-2 London).

### 5b. Battery Tracking
If `battery` is provided, TIP updates the label's `batteryPct` field. A daily cron job alerts users when battery drops below 20% or 10%.

### 5c. Shipment State Transitions
```
PENDING ──── first location report ────→ IN_TRANSIT
IN_TRANSIT ── geofence + dwell time ──→ DELIVERED
```

- **PENDING → IN_TRANSIT**: Automatic on first location report for that shipment
- **IN_TRANSIT → DELIVERED**: Automatic when 2+ readings within 100m of destination for 30+ minutes

### 5d. Email Notifications
- **In-Transit**: Consignee gets "your shipment is on the way" email
- **Delivered**: Both shipper and consignee get delivery confirmation
- **Low Battery**: Shipper gets warning at 20% and 10%
- **No Signal**: Alert if no location report for 24 hours
- **Stuck**: Alert if no movement >500m for 24 hours

### 5e. Cron Jobs (Daily)
| Job | Schedule | What It Does |
|-----|----------|--------------|
| check-delivery | 6:00 UTC | Re-checks geofence for all IN_TRANSIT shipments |
| check-battery | 7:00 UTC | Sends low battery alerts |
| check-signals | 8:00 UTC | Alerts on labels with no data for 24h |
| check-stuck | 9:00 UTC | Alerts on labels not moving for 24h |
| check-reminders | 10:00 UTC | Reminds users about unused labels |
| cleanup-data | Sunday 3:00 UTC | Deletes location data >90 days after delivery |

---

## 6. Database Schema Reference

You don't write directly to TIP's database — you send data via the API. But understanding the schema helps.

### Label (Physical Tracking Device)

```
id              String (cuid)     Primary key
deviceId        String (unique)   "HL-001234" — THIS IS WHAT YOU SEND
imei            String? (unique)  Device IMEI
iccid           String? (unique)  SIM card ICCID
status          Enum              INVENTORY | SOLD | ACTIVE | DEPLETED
batteryPct      Int?              0-100, updated from your reports
firmwareVersion String?
activatedAt     DateTime?         When QR code was scanned
```

### LocationEvent (Each Data Point You Send)

```
id              String (cuid)     Primary key
latitude        Float             From your report
longitude       Float             From your report
accuracyM       Int?              accuracy field, rounded
batteryPct      Int?              battery field
altitude        Float?
speed           Float?            m/s
recordedAt      DateTime          When device recorded (your recordedAt field)
receivedAt      DateTime          When TIP server received it
isOfflineSync   Boolean           Your isOfflineSync field
cellLatitude    Float?            Onomondo cell tower backup
cellLongitude   Float?            Onomondo cell tower backup
labelId         String            FK → Label
shipmentId      String?           FK → Shipment (linked automatically)
```

### Label Status Lifecycle

```
INVENTORY → Label in warehouse, not yet sold
    ↓ (purchased by customer)
SOLD → Label shipped to customer, not yet activated
    ↓ (QR code scanned by customer)
ACTIVE → GPS transmitting, tracking cargo
    ↓ (battery dies)
DEPLETED → Battery dead, no longer transmitting
```

---

## 7. Hardware Data Format (From Onomondo)

This is what the hardware labels currently send to label.utec.ua. Your service needs to accept this format (or the Onomondo webhook format) and transform it.

```typescript
interface DeviceDataOut {
  iccid: string              // SIM card ID (maps to Label.iccid)
  imei: string               // Device IMEI (maps to Label.imei)
  latitude: number           // GPS latitude
  longitude: number          // GPS longitude
  timestamp: string          // ISO datetime
  onomondo_latitude?: number // Cell tower triangulation (backup)
  onomondo_longitude?: number
  battery?: number           // 0-100%
  signal_strength?: number   // Cell signal strength
  offline_queue?: Array<{    // Data cached when device was offline
    timestamp: string
    latitude: number
    longitude: number
    battery_pct?: number
  }>
}
```

### Transformation: Onomondo → TIP

```
Onomondo Field          → TIP Field
─────────────────────────────────────
iccid or imei           → deviceId (look up Label by iccid/imei to get deviceId)
latitude                → latitude
longitude               → longitude
timestamp               → recordedAt
onomondo_latitude       → cellLatitude
onomondo_longitude      → cellLongitude
battery                 → battery
(not available)         → accuracy (set from GPS metadata if available)
(not available)         → altitude (set from GPS metadata if available)
(not available)         → speed (set from GPS metadata if available)
offline_queue[].item    → send each as separate report with isOfflineSync=true
```

### Important: deviceId Mapping

TIP identifies devices by `deviceId` (e.g., `"HL-001234"`), NOT by ICCID or IMEI. Your service needs to maintain a mapping:

**Option A:** Query TIP's label data (we can add a lookup endpoint if needed)
**Option B:** Maintain your own mapping table: `iccid → deviceId`
**Option C:** Use the ICCID/IMEI as the deviceId (requires updating Label records in TIP)

Discuss with Denys which approach to use.

---

## 8. Recommended GCP Architecture

### Core Service: Cloud Run

```
┌─────────────────────────────────────┐
│         Cloud Run: device-api       │
│                                     │
│  POST /webhook/onomondo             │
│    ← Receives raw device data       │
│    → Validates & transforms         │
│    → Forwards to tip.live           │
│                                     │
│  GET /health                        │
│    ← Health check                   │
│                                     │
│  Service Account:                   │
│    device-api-sa@tip-live-platform  │
│                                     │
│  Region: us-central1               │
│  Min instances: 0 (scale to zero)  │
│  Max instances: 10                  │
│  Memory: 256Mi                      │
│  CPU: 1                             │
└─────────────────────────────────────┘
```

### Optional: Cloud Pub/Sub (for high throughput)

If device volume grows beyond what synchronous forwarding can handle:

```
Onomondo → Cloud Run → Pub/Sub Topic → Pub/Sub Subscription → Cloud Run (processor)
                                                                    ↓
                                                              POST tip.live/api/v1/device/report
```

### Secret Manager

Store these secrets:
- `DEVICE_API_KEY` — API key for authenticating with TIP
- `ONOMONDO_WEBHOOK_SECRET` — Verify Onomondo webhook signatures

### Monitoring & Logging

- Cloud Run logs are automatic (stdout/stderr → Cloud Logging)
- Set up alerts for:
  - Error rate > 5%
  - Latency > 5 seconds
  - No requests for 2+ hours (devices should report regularly)

### Container Registry

Docker images go to Artifact Registry:
```
us-central1-docker.pkg.dev/tip-live-platform/tip-device-api/device-api:latest
```

---

## 9. GCP Access & Getting Started

### Your GCP Permissions

You have been granted the following roles on project `tip-live-platform`:

| Role | What It Lets You Do |
|------|---------------------|
| Cloud Run Developer | Deploy, update, delete Cloud Run services |
| Cloud Build Editor | Build container images |
| Artifact Registry Writer | Push/pull Docker images |
| Storage Object Admin | Read/write files in Cloud Storage buckets |
| Pub/Sub Editor | Create topics and subscriptions |
| Logging Viewer | Read application logs |
| Monitoring Viewer | View metrics and dashboards |
| Secret Manager Accessor | Read secrets at runtime |
| Secret Manager Version Adder | Create new secret versions |
| Service Account User | Deploy Cloud Run with service accounts |
| Viewer | Read-only access to all project resources |

### What You CAN'T Do (by design)
- Delete the GCP project
- Manage billing
- Change IAM permissions for other users
- Access the TIP database directly (use the API)

### Setup Steps

```bash
# 1. Install Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

# 2. Authenticate
gcloud auth login
# → Sign in with yurii@tip.live

# 3. Set project
gcloud config set project tip-live-platform
gcloud config set run/region us-central1

# 4. Verify access
gcloud projects describe tip-live-platform
gcloud run services list
gcloud artifacts repositories list --location=us-central1

# 5. Configure Docker for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# 6. Clone the TIP repo (for reference)
git clone <repo-url>
# Look at: app/src/app/api/v1/device/report/route.ts
# Look at: app/src/lib/validations/device.ts
# Look at: app/src/types/index.ts
```

---

## 10. Testing Against Live TIP

### Test with curl

```bash
# Replace <API_KEY> with the actual device API key (ask Denys)

# Test: Send a location report for a known device
curl -X POST https://tip.live/api/v1/device/report \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{
    "deviceId": "HL-TEST001",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "battery": 95,
    "recordedAt": "2026-02-09T12:00:00.000Z"
  }'

# Expected: 404 (device not found) unless HL-TEST001 exists in database
# If device exists: 200 with locationId
```

### Creating Test Labels

Ask Denys to create test labels in the TIP admin panel (`https://tip.live/admin/labels`) with known deviceIds for testing.

### Monitoring Your Reports

After sending reports, check:
- **TIP Admin** → `https://tip.live/admin/devices` — see device status
- **TIP Admin** → `https://tip.live/admin/shipments` — see shipment state changes
- **GCP Logging** → `https://console.cloud.google.com/logs/query?project=tip-live-platform`

---

## 11. Deployment Workflow

### Build & Deploy to Cloud Run

```bash
# Build the Docker image
docker build -t device-api .

# Tag for Artifact Registry
docker tag device-api \
  us-central1-docker.pkg.dev/tip-live-platform/tip-device-api/device-api:latest

# Push to Artifact Registry
docker push \
  us-central1-docker.pkg.dev/tip-live-platform/tip-device-api/device-api:latest

# Deploy to Cloud Run
gcloud run deploy device-api \
  --image=us-central1-docker.pkg.dev/tip-live-platform/tip-device-api/device-api:latest \
  --region=us-central1 \
  --service-account=device-api-sa@tip-live-platform.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-secrets="DEVICE_API_KEY=DEVICE_API_KEY:latest" \
  --project=tip-live-platform
```

### Or Use Cloud Build (Recommended)

Create a `cloudbuild.yaml`:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/tip-device-api/device-api:$SHORT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/tip-device-api/device-api:$SHORT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'device-api'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/tip-device-api/device-api:$SHORT_SHA'
      - '--region=us-central1'
      - '--service-account=device-api-sa@$PROJECT_ID.iam.gserviceaccount.com'
      - '--allow-unauthenticated'
      - '--port=8080'
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/tip-device-api/device-api:$SHORT_SHA'
```

Then trigger builds with:
```bash
gcloud builds submit --config=cloudbuild.yaml .
```

---

## 12. Key Contacts & Resources

| Who | Role | Contact |
|-----|------|---------|
| Denys | CTO, TIP backend owner | denys@tip.live |
| Andrii | Hardware team, current device API | (ask Denys) |

### Key URLs

| Resource | URL |
|----------|-----|
| TIP Live | https://tip.live |
| TIP Admin | https://tip.live/admin |
| GCP Console | https://console.cloud.google.com/?project=tip-live-platform |
| Cloud Run | https://console.cloud.google.com/run?project=tip-live-platform |
| Artifact Registry | https://console.cloud.google.com/artifacts?project=tip-live-platform |
| Cloud Logging | https://console.cloud.google.com/logs?project=tip-live-platform |

### Key Files in the TIP Repo

| File | What It Contains |
|------|-----------------|
| `app/src/app/api/v1/device/report/route.ts` | The API endpoint your service calls — full implementation |
| `app/src/app/api/v1/device/activate/route.ts` | Label activation endpoint (QR scan) |
| `app/src/lib/validations/device.ts` | Zod validation schema for device reports |
| `app/src/types/index.ts` | `DeviceDataOut` interface from label.utec.ua |
| `app/prisma/schema.prisma` | Full database schema (Label, LocationEvent, Shipment) |
| `app/src/app/api/cron/check-delivery/route.ts` | Delivery detection logic (geofence algorithm) |
| `app/src/app/api/cron/check-battery/route.ts` | Battery monitoring cron |
| `app/src/app/api/cron/check-signals/route.ts` | Lost signal detection cron |
| `app/src/app/api/cron/check-stuck/route.ts` | Stuck shipment detection cron |

---

## Quick Start Checklist

- [ ] Run `gcloud auth login` with `yurii@tip.live`
- [ ] Run `gcloud config set project tip-live-platform`
- [ ] Verify access: `gcloud run services list`
- [ ] Read this guide (especially sections 4, 7, 8)
- [ ] Review `app/src/app/api/v1/device/report/route.ts` in the repo
- [ ] Get `DEVICE_API_KEY` from Denys
- [ ] Set up local dev environment for your Cloud Run service
- [ ] Send a test report to `https://tip.live/api/v1/device/report`
- [ ] Build & deploy first version to Cloud Run
- [ ] Configure Onomondo webhook to point to your Cloud Run URL
- [ ] Verify end-to-end: hardware label → your service → TIP → tracking page
