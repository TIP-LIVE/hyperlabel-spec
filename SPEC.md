# HyperLabel Product Specification

**Version:** 1.0  
**Last Updated:** January 15, 2026  
**Status:** MVP Definition  
**Document Owner:** Denys Chumak (Product Manager)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision & Strategy](#2-vision--strategy)
3. [Target Users & Personas](#3-target-users--personas)
4. [Hardware Specification](#4-hardware-specification)
5. [Platform & Features](#5-platform--features)
6. [Technical Architecture](#6-technical-architecture)
7. [Business Model](#7-business-model)
8. [Security & Compliance](#8-security--compliance)
9. [Operations & Launch](#9-operations--launch)
10. [Team & Budget](#10-team--budget)
11. [Roadmap](#11-roadmap)
12. [Appendix](#12-appendix)

---

## 1. Executive Summary

### 1.1 Product Overview

**HyperLabel** (working name: Smart Tracking Label) is a disposable, ultra-thin LTE tracking label that provides transparent door-to-door cargo tracking across all transport modes, regardless of carrier.

### 1.2 Value Proposition

> A $20+ disposable thin LTE label that eliminates "black holes" in cargo tracking—providing real-time visibility even during flights or ocean transit—and proactively alerts customers to delays or route deviations.

### 1.3 Key Differentiators

| Feature | HyperLabel | Traditional Trackers |
|---------|------------|---------------------|
| **Price** | $20-30 (disposable) | $100-500 (reusable) |
| **Form Factor** | 10×15cm, 3.5mm thin | Bulky devices |
| **UX** | Consumer-grade simplicity | Enterprise complexity |
| **Coverage** | 180+ countries, flight/ocean capable | Carrier-dependent |
| **Setup** | Scan QR, peel, stick | Complex onboarding |

### 1.4 MVP Success Criteria (Targets)

| Metric | Target | Notes |
|--------|--------|-------|
| Labels sold | 50 | First 3 months post-launch |
| Paying customers | 10 | B2B businesses |
| Platform uptime | >99% | Measured monthly |
| Tracking reliability | 100% | End-to-end works reliably |
| Real shipments | 1+ | Successful China → US/EU route |

---

## 2. Vision & Strategy

### 2.1 Vision Statement

> Become the global standard for transparent cargo tracking, eliminating "black holes" in logistics. By 2030, enable real-time visibility for any shipment, anywhere, with predictive intelligence for delays and route deviations.

### 2.2 Problem Statement

| Problem | Impact | HyperLabel Solution |
|---------|--------|---------------------|
| **Black Holes** | Cargo goes dark during transit (flights, ocean, remote areas) | Offline data storage + transmission when connectivity returns |
| **Carrier Fragmentation** | Different carriers = different tracking systems, no unified view | Single tracking interface regardless of carrier |
| **Reactive Tracking** | Users discover delays after they happen | Proactive alerts for delays/deviations (post-MVP) |

### 2.3 Competitive Landscape

#### Direct Competitors

| Competitor | Type | Price Point | Differentiator |
|------------|------|-------------|----------------|
| [Tive](https://tive.com) | Reusable tracker | $100-300 | Enterprise-focused, cold chain |
| [Roambee](https://roambee.com) | Reusable tracker | $150-400 | Supply chain analytics |
| [Sensitech](https://sensitech.com) | Reusable tracker | $200-500 | Pharma/cold chain focus |
| [Controlant](https://controlant.com) | Reusable tracker | $300+ | FDA-compliant cold chain |
| [SODAQ](https://sodaq.com) | Smart Label | €50-100 | Solar-powered, reusable |
| [Sensos](https://sensos.io/label/) | Smart Label | €30-80 | AI-powered analytics |
| [G+D Smart Label](https://gi-de.com) | Smart Label | €40-100 | 2.4mm thin, iSIM |
| [Minew](https://minew.com) | Hardware OEM | Varies | Chinese manufacturing |
| [Reelables](https://reelables.com) | Disposable label | $15-25 | Similar positioning |

#### Competitive Positioning

```
                    HIGH PRICE
                        │
     Sensitech ●        │        ● Controlant
                        │
     Roambee ●          │        ● Tive
                        │
    ────────────────────┼────────────────────
    ENTERPRISE          │           CONSUMER
                        │
     SODAQ ●            │        ● G+D
                        │
     Sensos ●           │    ★ HyperLabel
                        │
                    LOW PRICE
```

**HyperLabel Position:** Low price + Consumer-grade simplicity

### 2.4 Target Market

| Metric | Value | Notes |
|--------|-------|-------|
| **TAM** | TBD | Global cargo tracking market |
| **SAM** | TBD | Addressable with disposable labels |
| **SOM** | TBD | Realistic first-year capture |
| **Initial Geography** | China → US, UK, EU | Andrii's network + manufacturing base |

*Note: Market sizing to be calculated for investor deck*

---

## 3. Target Users & Personas

### 3.1 Persona Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              USER JOURNEY                                                              │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬──────────┤
│   BUY     │  SHARE    │  ENTER    │  RECEIVE  │  SCAN QR  │ ACTIVATE  │  TRANSIT  │    GET    │  ARCHIVE  │          │
│  LABEL    │   LINK    │  ORIGIN   │  LABEL    │FULFILLMENT│ & ATTACH  │  & TRACK  │YOUR CARGO │           │          │
├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼──────────┤
│★Consignee │★Consignee │  Shipper  │  Shipper  │  Shipper  │  Shipper  │★Consignee │★Consignee │  Service  │          │
│  (buyer)  │  (buyer)  │ (origin)  │ (origin)  │(warehouse)│ (origin)  │ (tracker) │ (receiver)│   Team    │          │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴──────────┘
```

**Key Flow:** 
1. Consignee buys label
2. Consignee shares link with Shipper/Forwarder (email reminders until activated)
3. Shipper enters origin address → Label ships to them
4. Shipper scans QR at fulfillment warehouse (API integration by SKU)
5. Shipper activates label, enters destination, adds cargo photo(s), attaches to cargo
6. Consignee tracks cargo → gets their cargo

### 3.2 Primary Persona: Consignee (Buyer/Receiver)

| Attribute | Description |
|-----------|-------------|
| **Role** | Business receiving valuable shipments |
| **Type** | B2B (primary), B2C (future) |
| **Tech Level** | Medium - comfortable with web apps |
| **Pain Point** | "Where is my cargo? Why is it delayed?" |
| **Decision Maker** | Yes - purchases label before shipping |

**User Story:**
> As a Consignee, I want to know exactly where my cargo is at all times, so I can plan operations and catch problems before they escalate.

### 3.3 Secondary Persona: Shipper (Forwarder)

| Attribute | Description |
|-----------|-------------|
| **Role** | Logistics company arranging shipments |
| **Current Tools** | Carrier portals, TMS, Excel, email |
| **Pain Point** | "I need to answer customer questions about shipment status" |
| **HyperLabel Use** | Receives shared tracking links, views dashboard |

**User Story:**
> As a Forwarder, I want to share a tracking link with my clients, so they can self-serve status updates instead of calling me.

### 3.4 Tertiary Persona: Shipper (Carrier)

| Attribute | Description |
|-----------|-------------|
| **Role** | Physical transport (trucking, air, ocean) |
| **MVP Interaction** | Physical label only - no dashboard needed |
| **Pain Point** | N/A for MVP |

### 3.5 Internal Persona: Service Team (HyperLabel)

| Attribute | Description |
|-----------|-------------|
| **Role** | HyperLabel operations team |
| **Tools** | Admin panel |
| **Responsibilities** | User support, label inventory, device management |

### 3.6 Target Cargo Types

**MVP Focus:**
1. High-value electronics (phones, laptops, components)
2. Manufacturing parts (B2B shipments)
3. E-commerce high-value goods (luxury items, collectibles)
4. High value goods
5. Time critical cargo
6. Pharma
7. Air cargo over 500kg

**Future Expansion:**
- Perishables (requires temperature monitoring)
- Art and collectibles

### 3.7 User Journey Entry Points

| Entry Point | User State | Typical Action |
|-------------|------------|----------------|
| **Proactive** | Planning valuable shipment | Purchases label in advance |
| **Reactive** | Had bad experience with lost/delayed cargo | Searches for tracking solutions |
| **Referral** | Recommended by forwarder/partner | Follows recommendation |

---

## 4. Hardware Specification

### 4.1 Physical Specifications

| Attribute | Specification |
|-----------|---------------|
| **Form Factor** | ~10 × 15 cm label |
| **Thickness** | ~3.5 mm ultra-thin profile |
| **Attachment** | Adhesive backing (peel and stick) |
| **Placement** | Inside or outside packaging |
| **Visibility** | Optional (visible = deterrent effect) |

### 4.2 Connectivity

| Attribute | Specification |
|-----------|---------------|
| **Primary** | LTE Cat-1 / Cat-1bis |
| **SIM** | Global Soft-SIM (eSIM) |
| **Coverage** | 180+ countries |
| **Protocol** | HTTPS REST API to backend |

### 4.3 Sensors & Data

**MVP Sensors:**
| Sensor | Data | Update Frequency |
|--------|------|-----------------|
| GPS/GNSS | Latitude, Longitude | Every 120 min (configurable) |
| LTE Signal | Cell tower triangulation | Continuous |
| Battery | Percentage, estimated days | Every transmission |

**Post-MVP Sensors:**
| Sensor | Use Case |
|--------|----------|
| Temperature | Cold chain monitoring |
| Shock/Tilt | Damage detection |
| Light exposure | Tamper detection |

### 4.4 Battery & Lifecycle

| Attribute | Specification |
|-----------|---------------|
| **Battery Life** | Up to ~60 days |
| **Lifecycle** | Single-use / Disposable |
| **Reactivation** | Not supported |
| **End of Life** | Discard after delivery or battery depletion |

### 4.5 Data Transmission

| Scenario | Behavior |
|----------|----------|
| **In Coverage** | Transmit every 120 minutes (configurable) |
| **Out of Coverage** | Store locally, transmit when connectivity returns |
| **Low Battery** | Alert at 20% and 10% |
| **On-Demand** | Future: User-triggered ping |

**Key Feature:** Offline data storage eliminates "black holes" during flights and ocean transit.

### 4.6 Full User Journey & Activation

```
┌─────────────────────────────────────────────────────────────────┐
│                      FULL USER JOURNEY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. BUY LABEL (Consignee)                                       │
│           │    Consignee purchases label on website              │
│           ▼                                                      │
│  2. SHARE LINK (Consignee → Shipper or Forwarder)               │
│           │    Consignee sends link to shipper/forwarder         │
│           │    • 1-3 email reminders that link not activated yet │
│           │    • Link to consignee showing where label is now    │
│           ▼                                                      │
│  3. ENTER ORIGIN (Shipper)                                      │
│           │    Shipper clicks link, enters their address         │
│           │    → Label ships to shipper                          │
│           ▼                                                      │
│  4. RECEIVE LABEL (Shipper)                                     │
│           │    Label arrives at shipper with quick-start guide   │
│           ▼                                                      │
│  5. SCAN QR - FULFILLMENT WAREHOUSE                             │
│           │    • Link notification sent to consignee             │
│           │    • API integration by SKU                          │
│           ▼                                                      │
│  6. ACTIVATE & ATTACH (Shipper)                                 │
│           │    • Activate label (battery)                        │
│           │    • Enter final destination (where cargo is going)  │
│           │    • Add photo(s) of cargo label (camera/attach)     │
│           │    • Attach label to cargo                           │
│           ▼                                                      │
│  7. TRANSIT & TRACK (Consignee)                                 │
│           │    Cargo moves, label transmits every 120 min        │
│           │    Consignee tracks shipment in real-time            │
│           ▼                                                      │
│  8. GET YOUR CARGO (Consignee)                                  │
│                Cargo arrives, notification sent, tracking ends   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight:** The Consignee (buyer) may not know the shipper's exact address. They share a link so the shipper can enter their own origin address. This triggers label shipment to the shipper.

### 4.7 Label SKUs

**MVP:** Single SKU (standard label)

**Future Variants:**
| Variant | Features | Use Case |
|---------|----------|----------|
| Cold Chain | + Temperature sensor | Pharma, perishables |
| Extended | + 90-day battery | Long ocean voyages |
| Compact | Smaller form factor | Small packages |

---

## 5. Platform & Features

### 5.1 Platform Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      HYPERLABEL PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   LANDING   │    │  CUSTOMER   │    │   ADMIN     │         │
│  │    PAGE     │    │   PORTAL    │    │   PANEL     │         │
│  │  (Public)   │    │ (All Users) │    │ (Internal)  │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                     ┌──────┴──────┐                             │
│                     │   BACKEND   │                             │
│                     │    API      │                             │
│                     └──────┬──────┘                             │
│                            │                                    │
│              ┌─────────────┼─────────────┐                      │
│              │             │             │                      │
│        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐               │
│        │  Database │ │   Stripe  │ │   Email   │               │
│        │ (PostGIS) │ │ (Payments)│ │ (Notif.)  │               │
│        └───────────┘ └───────────┘ └───────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Web Applications

#### 5.2.1 Landing Page (Public)

**Purpose:** Marketing site with purchase CTA

| Feature | Description | Priority |
|---------|-------------|----------|
| Hero section | Value proposition, product image | MVP |
| How it works | 3-step explanation | MVP |
| Pricing | Label pricing tiers | MVP |
| Buy CTA | Link to purchase flow | MVP |
| FAQ | Common questions | MVP |
| Contact | Email, support info | MVP |

#### 5.2.2 Customer Portal (All Users)

**Purpose:** Tracking dashboard for customers

| Feature | Description | Priority |
|---------|-------------|----------|
| **Dashboard** | Overview of all shipments | MVP |
| **Shipment List** | Table of active/completed shipments | MVP |
| **Shipment Detail** | Map + timeline for single shipment | MVP |
| **Add Shipment** | Link label to new shipment | MVP |
| **Share Link** | Generate public tracking URL | MVP |
| **Account Settings** | Profile, password, notifications | MVP |
| **Order Labels** | Purchase additional labels | MVP |
| **Billing History** | View past orders | MVP |

#### 5.2.3 Admin Panel (Internal)

**Purpose:** Internal operations tool for HyperLabel team

| Feature | Description | Priority |
|---------|-------------|----------|
| **User Management** | View/edit customer accounts | MVP |
| **Label Inventory** | Track label stock, assignments | MVP |
| **Device Health** | IMEI, firmware, session monitoring | MVP |
| **Order Management** | View/process orders | MVP |
| **Support Tools** | Look up shipments, resolve issues | MVP |
| **Analytics** | Usage metrics, health dashboard | Post-MVP |

### 5.3 Tracking Features

#### 5.3.1 Live Tracking View

```
┌─────────────────────────────────────────────────────────────────┐
│  SHIPMENT: SHP-2026-001234                              [Share] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │                      [MAP VIEW]                          │   │
│  │                                                          │   │
│  │            ●━━━━━━━━━━━●━━━━━━━━━━━○                     │   │
│  │         Shenzhen    Dubai      London                    │   │
│  │          (origin)  (current)  (destination)              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Status: IN TRANSIT                    Last Update: 2 min ago   │
│  Battery: 72%                          ETA: Jan 18 (estimated)  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ROUTE HISTORY                                                   │
│  ────────────────────────────────────────────────────────────── │
│  ● Jan 15, 09:32  Shenzhen, CN    Label activated               │
│  ● Jan 15, 14:45  Hong Kong, HK   Departed port                 │
│  ● Jan 16, 03:12  ✈ In flight     (stored data transmitted)     │
│  ● Jan 16, 08:30  Dubai, AE       Arrived hub                   │
│  ○ Jan 18 (est)   London, UK      Expected delivery             │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Public Tracking Page (Shared Link)

**URL Format:** `https://track.hyperlabel.com/s/{tracking_code}`

**Visible Information:**
- Current location on map
- Shipment status (in transit, delivered, etc.)
- Last update timestamp
- Route history (full path)
- ETA (post-MVP)

**Hidden Information:**
- Owner/account details
- Cargo contents or value
- Other shipments

**Controls:**
- Owner can disable/enable sharing
- Link expires after 90 days post-delivery

### 5.4 Map & Visualization

| Attribute | Decision |
|-----------|----------|
| **Map Provider** | Google Maps (best global coverage) |
| **Alternative** | Mapbox (consider at scale for cost) |
| **Update Method** | Polling/auto-refresh every 60 seconds (MVP) |
| **Future** | WebSocket for true real-time |

### 5.5 Notifications

#### MVP Notification Channels

| Channel | Use Case |
|---------|----------|
| **Email** | Primary notification method |
| **Webhook** | Developer/integration use |

#### MVP Notification Events

| Event | Trigger | Recipients | Tier |
|-------|---------|------------|------|
| Label Activated | Label begins transmitting | Owner | Free |
| Low Battery | Battery drops below 20%, 10% | Owner | Free |
| Extended No-Signal | No transmission for >24 hours | Owner | Free |
| Shipment Delivered | Label detects final location | Owner | Premium |
| Shipment is Stuck | No movement detected for extended period | Owner | Premium |

#### Post-MVP Notifications

- SMS alerts
- Mobile push notifications
- Delay/deviation alerts (predictive)
- Geofence alerts

### 5.6 Data Retention

| Data Type | Retention Period | Tier |
|-----------|------------------|------|
| Location history | 30 days post-delivery | Free |
| Location history | 90+ days post-delivery | Premium Subscription |
| Account data | Until account deletion | All (GDPR compliant) |
| Exported data | User responsibility | All (CSV download available) |

---

## 6. Technical Architecture

### 6.1 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React / Next.js | Modern, SEO-friendly, fast |
| **Backend** | Python (FastAPI) or Node.js (NestJS) | API-first, async support |
| **Database** | PostgreSQL + PostGIS | Relational + geospatial queries |
| **Auth** | Clerk | Managed auth, fast implementation |
| **Payments** | Stripe | Industry standard, global support |
| **Email** | SendGrid / Resend | Transactional email |
| **Maps** | Google Maps API | Best global coverage |
| **Cloud** | GCP | Aligns with Google Credits goal |
| **CI/CD** | GitHub Actions | Integrated with repo |

### 6.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SYSTEM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    CLIENTS                           EXTERNAL                    │
│    ───────                           ────────                    │
│    ┌─────────┐  ┌─────────┐         ┌─────────┐                │
│    │ Landing │  │Customer │         │ Label   │                │
│    │  Page   │  │ Portal  │         │ Device  │                │
│    └────┬────┘  └────┬────┘         └────┬────┘                │
│         │            │                    │                      │
│         │            │                    │ HTTPS                │
│         └─────┬──────┘                    │                      │
│               │                           │                      │
│    ┌──────────┴──────────────────────────┴────────┐            │
│    │                 API GATEWAY                   │            │
│    │              (Cloud Run / GCP)                │            │
│    └──────────────────────┬───────────────────────┘            │
│                           │                                      │
│    ┌──────────────────────┴───────────────────────┐            │
│    │                BACKEND API                    │            │
│    │              (FastAPI/NestJS)                 │            │
│    ├──────────────────────────────────────────────┤            │
│    │  Auth    │  Tracking  │  Orders  │  Admin   │            │
│    │ (Clerk)  │  Service   │ Service  │ Service  │            │
│    └──────────────────────┬───────────────────────┘            │
│                           │                                      │
│    ┌──────────┬───────────┼───────────┬──────────┐            │
│    │          │           │           │          │              │
│    ▼          ▼           ▼           ▼          ▼              │
│ ┌──────┐ ┌──────┐   ┌──────────┐ ┌──────┐ ┌──────────┐        │
│ │Postgr│ │ GCS  │   │  Stripe  │ │Email │ │  Google  │        │
│ │ SQL  │ │(files│   │(payments)│ │(Send │ │   Maps   │        │
│ │      │ │      │   │          │ │Grid) │ │          │        │
│ └──────┘ └──────┘   └──────────┘ └──────┘ └──────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Device Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVICE → BACKEND FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐         HTTPS POST              ┌─────────────┐   │
│  │  Label  │ ──────────────────────────────► │  Ingestion  │   │
│  │ Device  │    /api/v1/device/report        │  Endpoint   │   │
│  └─────────┘                                 └──────┬──────┘   │
│                                                     │           │
│  Payload:                                           ▼           │
│  {                                            ┌──────────┐     │
│    "device_id": "HL-001234",                  │ Validate │     │
│    "timestamp": "2026-01-15T10:30:00Z",       │ & Store  │     │
│    "latitude": 25.2048,                       └────┬─────┘     │
│    "longitude": 55.2708,                          │            │
│    "battery_pct": 72,                             ▼            │
│    "signal_strength": -85,                  ┌──────────┐      │
│    "offline_queue": [...]                   │ Database │      │
│  }                                          └──────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Responsibility Split:**
- **Hardware Team (Andrii):** Firmware that sends HTTPS requests
- **Platform (Denys):** Backend API that receives and processes data

### 6.4 Data Quality & Cleaning

To ensure users see accurate, clean tracking data, the platform applies the following data processing:

| Issue | Detection | Resolution |
|-------|-----------|------------|
| **Zero coordinates** | lat=0, lon=0 | Filter out, do not display |
| **Extreme coordinates** | Outside valid GPS range (lat: -90 to 90, lon: -180 to 180) | Filter out, do not display |
| **Duplicate points** | Same location within short timeframe | Deduplicate, show single point |
| **GPS drift/noise** | Small movements while stationary | Group nearby points, smooth path |
| **Address grouping** | Multiple points at same address | Consolidate to single location with time range |
| **Outlier detection** | Impossible speed between points | Flag for review, interpolate if needed |

**Processing Pipeline:**
1. **Ingest** — Receive raw location data from device
2. **Validate** — Check for zero/extreme/invalid coordinates
3. **Clean** — Remove invalid points, deduplicate
4. **Enrich** — Reverse geocode to addresses, detect transport mode
5. **Store** — Save cleaned data to database
6. **Display** — Show user clean, accurate tracking history

### 6.5 API Design

#### Public API Endpoints (MVP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/shipments` | List user's shipments |
| `GET` | `/api/v1/shipments/{id}` | Get shipment detail |
| `POST` | `/api/v1/shipments` | Create new shipment |
| `PUT` | `/api/v1/shipments/{id}` | Update shipment |
| `GET` | `/api/v1/shipments/{id}/tracking` | Get location history |
| `POST` | `/api/v1/shipments/{id}/share` | Generate share link |
| `GET` | `/api/v1/labels` | List user's labels |
| `POST` | `/api/v1/labels/{id}/activate` | Activate a label |

#### Device API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/device/report` | Receive location data from device |
| `POST` | `/api/v1/device/heartbeat` | Device health check |

#### GPS Tracking API (Hardware)

**Documentation:** https://label.utec.ua/api/docs

This is the GPS tracking API provided by the hardware team for device communication and location data.

#### Public Tracking Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/public/track/{code}` | Public tracking page data |

### 6.6 Database Schema (Simplified)

```sql
-- Users (managed by Clerk, reference only)
users (
  id UUID PRIMARY KEY,
  clerk_id VARCHAR,
  email VARCHAR,
  created_at TIMESTAMP
)

-- Labels (physical devices)
labels (
  id UUID PRIMARY KEY,
  device_id VARCHAR UNIQUE,      -- HL-001234
  status ENUM('inventory', 'sold', 'active', 'depleted'),
  battery_pct INTEGER,
  firmware_version VARCHAR,
  activated_at TIMESTAMP,
  created_at TIMESTAMP
)

-- Shipments
shipments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  label_id UUID REFERENCES labels,
  name VARCHAR,
  origin_address TEXT,
  destination_address TEXT,
  status ENUM('pending', 'in_transit', 'delivered', 'cancelled'),
  share_code VARCHAR UNIQUE,
  share_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  delivered_at TIMESTAMP
)

-- Location Events
location_events (
  id UUID PRIMARY KEY,
  label_id UUID REFERENCES labels,
  shipment_id UUID REFERENCES shipments,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy_m INTEGER,
  battery_pct INTEGER,
  recorded_at TIMESTAMP,        -- When device recorded
  received_at TIMESTAMP,        -- When server received
  is_offline_sync BOOLEAN       -- From offline queue
)

-- Orders
orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  stripe_payment_id VARCHAR,
  status ENUM('pending', 'paid', 'shipped', 'delivered'),
  total_amount INTEGER,         -- In cents
  quantity INTEGER,
  shipping_address JSONB,
  created_at TIMESTAMP
)
```

### 6.7 Scalability

| Metric | MVP Target | Design For |
|--------|------------|------------|
| Active labels | Hundreds | 10,000+ |
| Location events/day | ~10,000 | 1,000,000+ |
| Concurrent users | ~100 | 1,000+ |

**Scalability Approach:**
- Stateless API servers (horizontal scaling)
- PostgreSQL with read replicas (if needed)
- TimescaleDB for location time-series (future)
- CDN for static assets

### 6.8 Data Residency

| Requirement | MVP Approach |
|-------------|--------------|
| Primary Region | US (GCP us-central1) |
| GDPR Compliance | Required for EU customers |
| Multi-region | Post-MVP for enterprise |

### 6.9 Uptime & SLA

| Tier | Target | Notes |
|------|--------|-------|
| MVP | 99.5% | ~1.8 days downtime/year allowed |
| Future (Enterprise) | 99.9% | ~8.7 hours downtime/year |

---

## 7. Business Model

### 7.1 Revenue Model

**MVP:** Label sales only (one-time purchase)

**Future Revenue Streams:**
| Stream | Description | Timeline |
|--------|-------------|----------|
| Premium subscription | Extended retention, analytics | Post-MVP |
| API access fees | Third-party integrations | Post-MVP |
| White-label licensing | B2B partnerships | Year 2+ |
| Data insights | Aggregated, anonymized | Year 2+ |

### 7.2 Pricing

#### Label Pricing (MVP)

| Quantity | Price per Label | Total |
|----------|-----------------|-------|
| 1 label | $25 | $25 |
| 5-pack | $22 | $110 |
| 10-pack | $20 | $200 |

**Post-MVP:** Enterprise bulk pricing (100+ labels)

#### What's Included

- Physical label device
- Free delivery to shipper
- 60 days of tracking
- Platform access
- Email notifications
- Shareable tracking link
- 90 days data retention

### 7.3 Payment Processing

| Attribute | Specification |
|-----------|---------------|
| Provider | Stripe |
| Methods | Credit/Debit card |
| Currencies | USD (MVP), multi-currency (future) |
| Invoicing | Post-MVP for enterprise |

### 7.4 Refund Policy

| Scenario | Policy |
|----------|--------|
| Defective label | Full replacement or refund |
| Unused (sealed) | Refund within 30 days |
| Activated label | No refund |
| Cancelled shipment | No refund if activated |

---

## 8. Security & Compliance

### 8.1 Data Classification

| Data Type | Sensitivity | Handling |
|-----------|-------------|----------|
| Location data | Medium | Encrypted at rest, TLS in transit |
| User accounts | Medium | Managed by Clerk |
| Payment data | High | Handled by Stripe (not stored) |
| Shipment metadata | Low | Standard protection |

**NOT Handling:**
- Cargo contents
- Cargo declared value
- Customs documentation

### 8.2 Access Control

| Role | Access Level |
|------|--------------|
| Owner | Full access to own shipments |
| Shared link viewer | Location + status only |
| Admin (internal) | All data (with audit logging) |

**Sharing Controls:**
- Owner can enable/disable shared link
- Shared links expire 90 days after delivery

### 8.3 Compliance Requirements

#### MVP Compliance

| Requirement | Status |
|-------------|--------|
| GDPR | Required (EU customers) |
| E-commerce regulations | Standard compliance |
| Data encryption | TLS 1.3 + encryption at rest |

#### Not in MVP Scope

| Requirement | Notes |
|-------------|-------|
| FDA (pharma) | Requires cold chain certification |
| SOC 2 | Future for enterprise |
| ISO 27001 | Future consideration |

### 8.4 Audit & Logging

| Requirement | Implementation |
|-------------|----------------|
| Location events | Immutable, append-only storage |
| User actions | Audit log with timestamps |
| Admin actions | Full audit trail |
| Exports | Available for dispute resolution |

### 8.5 Data Deletion (GDPR)

| Request | Action |
|---------|--------|
| Account deletion | Delete account + all tracking history |
| Data export | Provide CSV of all user data |
| Auto-purge | 90 days after shipment completion |

---

## 9. Operations & Launch

### 9.1 MVP Geography

| Region | Role |
|--------|------|
| **China** | Manufacturing, initial shipments origin |
| **US** | Primary sales market |
| **UK/EU** | Secondary sales market |
| **Global** | Label works in 180+ countries |

### 9.2 Label Fulfillment

| Stage | Responsibility |
|-------|---------------|
| Manufacturing | Andrii / Hardware team (China) |
| Inventory | China warehouse |
| Order processing | Platform (Stripe integration) |
| Shipping | 3PL partner (TBD) |
| Customer delivery | DHL/FedEx international |

### 9.3 Pilot Customers

**Status:** TBD - To be identified through user interviews

**Ideal Pilot Profile:**
- Forwarders with visibility pain points
- E-commerce businesses shipping internationally
- Companies in Andrii's network
- Willing to provide feedback

### 9.4 Support Model

#### MVP Support

| Channel | Availability |
|---------|--------------|
| Email | support@hyperlabel.com |
| Response time | 24-48 hours |
| FAQ | Self-service documentation |

#### Post-MVP Support

| Channel | Availability |
|---------|--------------|
| Chat | Business hours |
| Phone | Enterprise tier only |
| Dedicated CSM | Enterprise tier only |

### 9.5 Onboarding

| Element | Description |
|---------|-------------|
| Quick-start guide | Included with label shipment |
| In-app tooltips | First-time user guidance |
| Documentation | Online help center |
| Onboarding calls | Not included in MVP |

### 9.6 Testing Strategy

| Test Type | Description |
|-----------|-------------|
| Unit tests | Code-level testing |
| Integration tests | API and service testing |
| E2E tests | Full flow testing |
| Real shipment tests | China→US, China→UK routes |
| Load testing | Simulated device data |
| Beta program | Early users before public launch |

### 9.7 Go-Live Checklist

**Must Work Before Launch:**

- [ ] Label activation flow (QR → dashboard)
- [ ] Live tracking on map
- [ ] Payment processing (Stripe)
- [ ] Email notifications working
- [ ] Shared tracking link functional
- [ ] Admin panel operational
- [ ] Security review completed
- [ ] GDPR compliance verified
- [ ] 1+ successful real-world shipment tracked end-to-end
- [ ] Documentation published
- [ ] Support email configured

---

## 10. Team & Budget

### 10.1 Team Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      MVP TEAM STRUCTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌─────────────────┐                          │
│                    │ Andrii Tkachuk  │                          │
│                    │    Founder      │                          │
│                    │   (Hardware)    │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────┴──────────────┐                    │
│              │                             │                     │
│       ┌──────┴──────┐              ┌──────┴──────┐             │
│       │Denys Chumak │              │Andrii Pavlov│             │
│       │Product + Dev│              │   Design    │             │
│       │ (Part-time) │              │ (Part-time) │             │
│       └─────────────┘              └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Roles & Responsibilities

#### Andrii Tkachuk - Founder
- Hardware device development
- Manufacturing relationships
- Business strategy
- Funding/investors

#### Denys Chumak - Product Manager + Developer (Part-time, 3 months)

**Product Management:**
- Product specification
- Feature prioritization
- User interviews
- Business plan
- Investor materials

**Platform Development (100 hours / £5,000):**
- Full-stack development (vibe coding approach)
- Frontend: React/Next.js
- Backend: API development
- Database setup & integration
- Deployment & DevOps

**Arrangement:**
- Part-time engagement (3 months)
- Product: Existing scope
- Development: Additional 100 hours (£5,000 GBP)
- Post-MVP: Consider full-time role (20% equity, 2-year vest, 6-month cliff)

#### Andrii Pavlov - Designer (Part-time)
- Brand strategy & identity
- Landing page design
- UI kit (customer portal)
- UI kit (admin panel)

**Arrangement:**
- Part-time engagement

### 10.3 Team Allocation

| Category | Owner | Budget |
|----------|-------|--------|
| **Product** | Denys Chumak | £11,450 |
| **Development** | Denys Chumak | £5,000 (100 hours) |
| **Design** | Andrii Pavlov | £3,500 |
| **Services** | Website hosting, domain, etc. | £300 |
| **Research** | User interviews (recruitment, gifts) | £2,000 |
| **TOTAL** | | **£22,250** |

### 10.4 Deliverables (3-Month MVP)

#### 10.4.1 Platform Development (Denys)

| Deliverable | Description |
|-------------|-------------|
| Web (All Users) | Sign Up/Sign In, Tracking dashboard |
| Web (Landing) | Landing page + CTA (buy) |
| Web (Admin) | Core operations panel |
| Backend | Core services (tracking, location history) |
| APIs | Tracking endpoints |
| Payment | Stripe integration |
| CI/CD | Automated deployment |
| SLA Definition | Service level agreement |

#### 10.4.2 Business & Investor Materials (Denys)

| Deliverable | Description |
|-------------|-------------|
| **Investor Deck** | Basic pitch deck for seed/angel conversations |
| **Teaser** | 1-page summary for initial investor outreach |
| **Financial Model** | 3-year projections: revenue, costs, unit economics |
| **Business Plan** | Market analysis, go-to-market strategy, competitive positioning |

#### 10.4.3 User Research - 80 Hours (Denys)

| Phase | Hours | Activities |
|-------|-------|------------|
| **Preparation** | 20 | Interview script design, recruitment criteria, scheduling, tool setup |
| **Conducting** | 40 | 1-on-1 interviews (est. 15-20 interviews @ 45-60 min each) |
| **Post-Analysis** | 20 | Transcription review, affinity mapping, insight synthesis, report |

**Interview Distribution by Persona:**

| Persona | Target Interviews | Focus Areas |
|---------|-------------------|-------------|
| Consignee (Buyer) | 8-10 | Pain points, willingness to pay, feature priorities |
| Forwarder | 4-6 | Workflow integration, activation experience |
| Logistics/Shipper | 2-3 | Industry validation, partnership potential |

#### 10.4.4 Design Deliverables (Andrii Pavlov)

| Deliverable | Description |
|-------------|-------------|
| **Brand Identity** | Logo, color palette, typography, brand guidelines |
| **Landing Page** | Marketing site design with CTA (buy) |
| **UI Kit (All Users)** | Customer portal components, tracking views, account screens |
| **UI Kit (Admin)** | Admin panel components, data tables, management views |
| **Label Design** | Physical label artwork, QR placement, quick-start guide |

---

## 11. Roadmap

### 11.0 Immediate Priorities (January 2026)

| Priority | Task | Owner | Deadline | Notes |
|----------|------|-------|----------|-------|
| **1** | Develop Customer Portal | Denys | Ongoing | Core platform development |
| **2** | Apply for UK Innovation Grant | Denys | TBD | Via [Tatton Consulting](https://ukgrantfunding.co.uk/how-we-help/) using UTEC (Andrii's company). Manage negotiation & document preparation. |
| **3** | Teaser, Financial Model & Business Plan | Denys | **06 Feb 2026** | 2-week deadline for investor materials |

#### Grant Application Process (Tatton Consulting)

**Agency:** Tatton Consulting - UK R&D Grant Experts  
**URL:** https://ukgrantfunding.co.uk/how-we-help/  
**Applicant Company:** UTEC (Andrii Tkachuk)

**Their 5-Step Process:**
1. Eligibility & Success Assessment
2. Strategic Roadmap & Project Design
3. Application Development & Submission
4. Post-Award Support & Compliance
5. Long-term Innovation Partner

**Our Responsibilities:**
- Provide technical documentation about HyperLabel
- Supply business plan & financial projections
- Coordinate with Tatton on application narrative
- Manage communication between UTEC and Tatton

**Target Schemes:** Innovate UK, potentially DASA (Defence) for logistics/supply chain

### 11.1 MVP Scope (3 Months)

#### Included in MVP

| Category | Features |
|----------|----------|
| **Core Tracking** | Live tracking, geolocation, status updates |
| **Label/Device** | Activation, configuration, health metrics |
| **Users** | Sign up, sign in, account management |
| **Business Logic** | Purchase, shipment management, sharing |
| **Payments** | Stripe checkout, order processing |
| **Notifications** | Email alerts (activation, delivery, low battery) |

#### NOT in MVP

| Category | Defer To |
|----------|----------|
| Mobile apps | Post-MVP (6-12 months) |
| Data science / ML | Post-MVP |
| Alert service (delay/deviation) | Post-MVP |
| Product analytics (PostHog) | Post-MVP |
| Marketing (acquisition, SEO) | Post-MVP |
| Customer support (chat, FAQ bot) | Post-MVP |
| Google Cloud credits ($100k+) | Post-MVP |
| Cold chain sensors | Hardware v2 |
| TMS/ERP integrations | Post-MVP |

### 11.2 User Jobs Mapping

| User Job | Who | MVP | Post-MVP |
|----------|-----|-----|----------|
| Buy label | Consignee (buyer) | ✅ | |
| Share link with shipper/forwarder | Consignee (buyer) | ✅ | |
| Receive activation reminders (1-3 emails) | Consignee (buyer) | ✅ | |
| Enter origin address | Shipper | ✅ | |
| Receive label | Shipper | ✅ | |
| Scan QR at fulfillment warehouse | Shipper | ✅ | |
| API integration by SKU | Shipper | ✅ | |
| Activate label (battery) | Shipper | ✅ | |
| Enter final destination (optional) | Shipper | ✅ | |
| Add cargo photo(s) | Shipper | ✅ | |
| Attach label to cargo | Shipper | ✅ | |
| Share tracking link | Consignee / Forwarder | ✅ | |
| Track cargo location | Consignee | ✅ | |
| View location history | Anyone with link | ✅ | |
| Live map view | Anyone with link | ✅ | |
| Receive delivery notification | Consignee | ✅ | |
| Recognise flight number + ship name | System | | ✅ |
| Track transport type | — | | ✅ |
| Track delivery delays | — | | ✅ |
| Track route deviations | — | | ✅ |
| Expected delivery date | — | | ✅ |

### 11.3 Delivery Stages

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          CARGO DELIVERY STAGES                                                         │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬─────────────────────┤
│   BUY     │  SHARE    │  ENTER    │  RECEIVE  │  SCAN QR  │ ACTIVATE  │  TRANSIT  │    GET    │       ARCHIVE       │
│  LABEL    │   LINK    │  ORIGIN   │  LABEL    │FULFILLMENT│ & ATTACH  │  & TRACK  │YOUR CARGO │                     │
├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼─────────────────────┤
│ Consignee │ Consignee │ Shipper   │ Shipper   │ Shipper   │ Shipper   │ Consignee │ Cargo     │ Data retained       │
│ buys      │ sends     │ enters    │ gets      │ scans at  │ activates │ tracks    │ arrives   │ 90 days             │
│ label     │ link to   │ their     │ label     │ warehouse │ battery,  │ cargo     │ at        │                     │
│           │ shipper/  │ address   │           │ (API/SKU) │ enters    │ real-time │ consignee │                     │
│           │ forwarder │           │           │           │ dest,     │           │           │                     │
│           │           │           │           │           │ adds photo│           │           │                     │
├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼─────────────────────┤
│ Platform: │ Platform: │ Platform: │           │ Platform: │ Platform: │ Platform: │ Platform: │ Platform:           │
│ Checkout  │ Share     │ Address   │           │ QR scan   │ Activation│ Live track│ Delivery  │ Export              │
│ Order     │ flow      │ capture   │           │ API integ │ Photo     │ Map view  │ detection │ Delete              │
│           │ Reminders │ → Ship    │           │ SKU link  │ Dest entry│ Alerts    │ Complete  │                     │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴─────────────────────┘
```

### 11.4 Post-MVP Roadmap

| Phase | Timeline | Key Features |
|-------|----------|--------------|
| **MVP** | Month 1-3 | Core tracking, purchase, sharing |
| **Phase 2** | Month 4-6 | Mobile app, SMS notifications, analytics |
| **Phase 3** | Month 7-9 | Delay prediction, route deviation alerts |
| **Phase 4** | Month 10-12 | TMS integrations, enterprise features |
| **Year 2** | 12+ months | Cold chain, white-label, international expansion |

---

### 11.5 Full Delivery Roadmap (3-Month MVP)

**Start Date:** January 26, 2026  
**End Date:** March 31, 2026  
**Owner:** Denys Chumak  
**Total Budget:** £16,450 (329 hours)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FULL DELIVERY PLAN (329 HOURS)                           │
│                      Start: 26 Jan 2026 → End: 31 Mar 2026                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  HOURS BREAKDOWN                                                                │
│  ════════════════                                                               │
│  Platform Development      100 hours   (£5,000)                                 │
│  User Research              80 hours   (included in PM)                         │
│  Investor Materials         50 hours   (⚠️ deadline: 06 Feb)                    │
│  Grant Application          30 hours   (ongoing)                                │
│  Product Management         69 hours   (spec, coordination, oversight)          │
│  ─────────────────────────────────────                                          │
│  TOTAL                     329 hours   (£16,450)                                │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  WEEK 1           WEEKS 2-5           WEEKS 6-9          WEEK 10               │
│  Jan 26-31        Feb 1-28            Mar 1-28           Mar 29-31             │
│  ════════════     ════════════        ════════════       ════════════          │
│  ~35 hours        ~140 hours          ~140 hours         ~14 hours             │
│  (5 days)         (20 days)           (20 days)          (3 days)              │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐     ┌─────────────┐    ┌─────────────┐       │
│  │⚠️ P2:      │  │ P2: Finish  │     │ E4: Portal  │    │ E9: Launch  │       │
│  │ INVESTOR   │─▶│ by Feb 6!   │     │ (14h)       │    │ Final QA    │       │
│  │ DOCS START │  │ (22h left)  │     └─────────────┘    └─────────────┘       │
│  │ (28h)      │  └─────────────┘     ┌─────────────┐                          │
│  └─────────────┘  ┌─────────────┐     │ E5: Tracking│                          │
│  ┌─────────────┐  │ P1: Research│     │ (14h)       │                          │
│  │ P6: PM     │  │ Prep (20h)  │     └─────────────┘                          │
│  │ (7h)       │  └─────────────┘     ┌─────────────┐                          │
│  └─────────────┘  ┌─────────────┐     │ E6: Payment │                          │
│                   │ P3: Research│     │ (10h)       │                          │
│                   │ Conduct(40h)│     └─────────────┘                          │
│                   └─────────────┘     ┌─────────────┐                          │
│                   ┌─────────────┐     │ E7: Admin   │                          │
│                   │ P4: Grant   │     │ (10h)       │                          │
│                   │ (20h)       │     └─────────────┘                          │
│                   └─────────────┘     ┌─────────────┐                          │
│                   ┌─────────────┐     │ E8: Notif   │                          │
│                   │ E1: Setup   │     │ (8h)        │                          │
│                   │ (10h)       │     └─────────────┘                          │
│                   └─────────────┘     ┌─────────────┐                          │
│                   ┌─────────────┐     │ P5: Research│                          │
│                   │ E2: Auth    │     │ Analysis    │                          │
│                   │ (12h)       │     │ (20h)       │                          │
│                   └─────────────┘     └─────────────┘                          │
│                   ┌─────────────┐     ┌─────────────┐                          │
│                   │ E3: Landing │     │ P4: Grant   │                          │
│                   │ (10h)       │     │ (10h)       │                          │
│                   └─────────────┘     └─────────────┘                          │
│                   ┌─────────────┐     ┌─────────────┐                          │
│                   │ P6: PM      │     │ P6: PM      │                          │
│                   │ (26h)       │     │ (26h)       │                          │
│                   └─────────────┘     └─────────────┘                          │
│                                                                                  │
│  ⚠️ CRITICAL: Feb 6 deadline = only 8 working days from start!                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

#### SUMMARY: Hours by Category

| Category | Hours | Budget | Notes |
|----------|-------|--------|-------|
| **Platform Development** | 100 | £5,000 | 9 technical epics |
| **User Research** | 80 | — | 15-20 interviews |
| **Investor Materials** | 50 | — | ⚠️ Deadline: 06 Feb 2026 |
| **Grant Application** | 30 | — | Tatton Consulting |
| **Product Management** | 69 | — | Spec, coordination |
| **TOTAL** | **329** | **£16,450** | |

---

## PRODUCT & BUSINESS EPICS

---

##### Epic P1: User Research - Preparation
**Goal:** Prepare for user interviews (scripts, recruitment, scheduling)  
**Estimate:** 20 hours  
**Timeline:** Month 1 (Weeks 1-2)

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| P1-T1 | Define research objectives | What questions need answering? | Google Docs | 2 |
| P1-T2 | Create interview script | Questions for each persona | Google Docs | 4 |
| P1-T3 | Define recruitment criteria | Target profiles, company sizes | Google Docs | 2 |
| P1-T4 | Source interview candidates | LinkedIn, networks, referrals | LinkedIn, email | 6 |
| P1-T5 | Schedule interviews | Book 15-20 interviews | Calendly | 3 |
| P1-T6 | Set up recording tools | Consent forms, recording setup | Zoom, Grain | 2 |
| P1-T7 | Create incentive plan | Gift cards, thank you process | Amazon | 1 |

**Deliverables:**
- [ ] Interview script (per persona)
- [ ] 15-20 interviews scheduled
- [ ] Recording tools ready

---

##### Epic P2: Investor Materials (⚠️ DEADLINE: 06 Feb 2026)
**Goal:** Create teaser, financial model, and business plan for investors  
**Estimate:** 50 hours  
**Timeline:** Month 1 (Weeks 1-4) - HIGH PRIORITY

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| P2-T1 | Market research | TAM/SAM/SOM, industry data | Google, reports | 8 |
| P2-T2 | Competitive analysis | Deep dive on competitors | Google, websites | 4 |
| P2-T3 | Teaser (1-pager) | Executive summary for outreach | Google Docs, Canva | 4 |
| P2-T4 | Financial model - Revenue | Pricing scenarios, sales projections | Google Sheets | 8 |
| P2-T5 | Financial model - Costs | COGS, opex, hiring plan | Google Sheets | 6 |
| P2-T6 | Financial model - Unit economics | CAC, LTV, margins | Google Sheets | 4 |
| P2-T7 | Business plan - Strategy | GTM, growth strategy | Google Docs | 6 |
| P2-T8 | Business plan - Operations | Team, milestones, risks | Google Docs | 4 |
| P2-T9 | Investor deck | 10-15 slide pitch deck | Google Slides, Figma | 6 |

**Deliverables:**
- [ ] 1-page Teaser
- [ ] 3-year Financial Model (Excel/Sheets)
- [ ] Business Plan document
- [ ] Investor Pitch Deck

---

##### Epic P3: User Research - Conducting Interviews
**Goal:** Conduct 15-20 user interviews across personas  
**Estimate:** 40 hours  
**Timeline:** Month 2 (Weeks 5-8)

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| P3-T1 | Consignee interviews (8-10) | Pain points, willingness to pay | Zoom | 15 |
| P3-T2 | Forwarder interviews (4-6) | Workflow, activation experience | Zoom | 10 |
| P3-T3 | Shipper interviews (2-3) | Industry validation, partnerships | Zoom | 5 |
| P3-T4 | Note-taking & highlights | Key quotes, insights per interview | Notion | 8 |
| P3-T5 | Send thank you & incentives | Gift cards, follow-up emails | Email, Amazon | 2 |

**Deliverables:**
- [ ] 15-20 completed interviews
- [ ] Notes & recordings for each
- [ ] Initial insights documented

---

##### Epic P4: Grant Application
**Goal:** Apply for UK Innovation Grant via Tatton Consulting  
**Estimate:** 30 hours  
**Timeline:** Month 1-2

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| P4-T1 | Initial consultation | Meet with Tatton, assess eligibility | Zoom | 2 |
| P4-T2 | Gather company docs | UTEC registration, financials | Email, Andrii | 3 |
| P4-T3 | Technical narrative | Write innovation/R&D description | Google Docs | 8 |
| P4-T4 | Market opportunity | Document market size, problem | Google Docs | 4 |
| P4-T5 | Project plan | Milestones, deliverables, timeline | Google Docs | 4 |
| P4-T6 | Budget justification | Cost breakdown for grant | Google Sheets | 3 |
| P4-T7 | Review & iteration | Multiple rounds with Tatton | Email, Zoom | 4 |
| P4-T8 | Final submission | Submit application | Portal | 2 |

**Deliverables:**
- [ ] Complete grant application submitted
- [ ] All supporting documents provided

---

##### Epic P5: User Research - Analysis & Report
**Goal:** Synthesize research findings into actionable insights  
**Estimate:** 20 hours  
**Timeline:** Month 3 (Weeks 9-10)

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| P5-T1 | Transcription review | Review all interview recordings | Grain, Otter | 4 |
| P5-T2 | Affinity mapping | Group insights by theme | FigJam, Miro | 4 |
| P5-T3 | Persona refinement | Update personas based on research | Google Docs | 3 |
| P5-T4 | Key findings document | Top 10 insights + evidence | Google Docs | 4 |
| P5-T5 | Recommendations | Product/feature recommendations | Google Docs | 3 |
| P5-T6 | Present to Andrii | Share findings with founder | Slides, Zoom | 2 |

**Deliverables:**
- [ ] Research report with key findings
- [ ] Updated personas
- [ ] Feature recommendations

---

##### Epic P6: Product Management & Coordination
**Goal:** Ongoing product management, spec updates, coordination  
**Estimate:** 69 hours  
**Timeline:** Ongoing (Month 1-3)

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| P6-T1 | Weekly syncs with Andrii | Status updates, decisions | Zoom | 12 |
| P6-T2 | Spec updates & maintenance | Keep SPEC.md current | GitHub | 8 |
| P6-T3 | Design coordination | Work with Andrii P. on designs | Figma, Slack | 10 |
| P6-T4 | Hardware integration planning | Coordinate device API with Andrii | Zoom, Docs | 8 |
| P6-T5 | Ticket management | Create/groom tickets in Linear | Linear | 8 |
| P6-T6 | Stakeholder updates | Progress reports, demos | Email, Loom | 6 |
| P6-T7 | Risk management | Identify/mitigate blockers | Docs | 4 |
| P6-T8 | Launch planning | GTM checklist, launch prep | Docs | 6 |
| P6-T9 | Documentation | User guides, help content | Notion | 4 |
| P6-T10 | Buffer / contingency | Unexpected tasks | Various | 3 |

**Deliverables:**
- [ ] Weekly progress updates
- [ ] Updated specifications
- [ ] Launch-ready platform

---

## TECHNICAL EPICS (Development)

---

#### MONTH 1: Foundation & Infrastructure (Weeks 1-4)

---

##### Epic 1: Project Setup & Infrastructure
**Goal:** Set up development environment, CI/CD, and core architecture  
**Estimate:** 10 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E1-T1 | Initialize monorepo | Create Next.js project with TypeScript, ESLint, Prettier | Next.js, pnpm | 1 |
| E1-T2 | Database setup | PostgreSQL + PostGIS on Supabase/Neon | Supabase, Prisma | 2 |
| E1-T3 | Database schema | Design tables: users, shipments, labels, locations, orders | Prisma, dbdiagram.io | 2 |
| E1-T4 | CI/CD pipeline | GitHub Actions for lint, test, deploy to Firebase/Cloud Run | GitHub Actions, Firebase | 2 |
| E1-T5 | Environment config | .env setup, secrets in GitHub Secrets, staging/prod split | GitHub Secrets | 1 |
| E1-T6 | Project structure | Folder structure, shared components, API routes | Next.js App Router | 2 |

**Deliverables:**
- [ ] Git repository with monorepo structure
- [ ] Database running with initial schema
- [ ] CI/CD pipeline deploying to staging
- [ ] README with setup instructions

---

##### Epic 2: Authentication & User Management
**Goal:** Implement user auth, profiles, and account management  
**Estimate:** 12 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E2-T1 | Clerk integration | Set up Clerk auth provider | Clerk | 2 |
| E2-T2 | Sign up flow | Email/password + social (Google) sign up | Clerk, React | 2 |
| E2-T3 | Sign in flow | Login page with error handling | Clerk, React | 1 |
| E2-T4 | User profile page | View/edit profile, change password | Next.js, Clerk | 2 |
| E2-T5 | User DB sync | Webhook to sync Clerk users to DB | Clerk Webhooks, API | 2 |
| E2-T6 | Protected routes | Middleware for auth-required pages | Next.js Middleware | 1 |
| E2-T7 | Session management | Handle tokens, refresh, logout | Clerk | 1 |
| E2-T8 | Email verification | Verify email before full access | Clerk | 1 |

**Deliverables:**
- [ ] Working sign up/sign in flow
- [ ] User profile page
- [ ] Protected routes for authenticated users
- [ ] User data synced to database

---

##### Epic 3: Landing Page
**Goal:** Build marketing site with product info and purchase CTA  
**Estimate:** 10 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E3-T1 | Page layout | Responsive layout, navigation, footer | Next.js, Tailwind | 2 |
| E3-T2 | Hero section | Value prop, product image, CTA button | Tailwind, Framer Motion | 2 |
| E3-T3 | How it works | 3-step visual explanation | React, Icons | 1 |
| E3-T4 | Features section | Key differentiators, benefits | Tailwind | 1 |
| E3-T5 | Pricing section | Label pricing tiers (1, 5, 10-pack) | React | 1 |
| E3-T6 | FAQ section | Accordion with common questions | Radix UI | 1 |
| E3-T7 | Contact section | Email, support info | React | 0.5 |
| E3-T8 | SEO & Meta | Meta tags, OG images, sitemap | Next.js, next-seo | 1 |
| E3-T9 | Mobile optimization | Responsive design testing | Chrome DevTools | 0.5 |

**Deliverables:**
- [ ] Live landing page at hyperlabel.com
- [ ] Responsive design (mobile + desktop)
- [ ] CTA linking to purchase flow
- [ ] SEO-optimized

---

#### MONTH 2: Core Features (Weeks 5-8)

---

##### Epic 4: Customer Portal & Dashboard
**Goal:** Build main customer dashboard with shipment management  
**Estimate:** 14 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E4-T1 | Dashboard layout | Sidebar nav, header, main content area | Tailwind, shadcn/ui | 2 |
| E4-T2 | Shipments overview | Cards showing active shipments summary | React, API | 2 |
| E4-T3 | Shipments list | Table with filters (status, date) | TanStack Table | 2 |
| E4-T4 | Create shipment | Form to create new shipment + link label | React Hook Form, Zod | 2 |
| E4-T5 | Shipment detail page | Full shipment view with map + timeline | Next.js Dynamic Routes | 2 |
| E4-T6 | Account settings | Notification prefs, profile edit | React, API | 2 |
| E4-T7 | Billing history | List of past orders/invoices | Stripe API | 1 |
| E4-T8 | Share link modal | Generate + copy public tracking URL | React, Clipboard API | 1 |

**Deliverables:**
- [ ] Working dashboard with shipment list
- [ ] Create/edit shipment functionality
- [ ] Account settings page
- [ ] Share link generation

---

##### Epic 5: Tracking Features & Device Integration
**Goal:** Implement live tracking, map view, and device API  
**Estimate:** 14 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E5-T1 | Device API endpoint | POST /api/v1/device/report | Next.js API Routes | 2 |
| E5-T2 | Location storage | Store GPS data with PostGIS | Prisma, PostGIS | 2 |
| E5-T3 | Data validation | Validate + clean incoming data (zero coords, etc.) | Zod | 1 |
| E5-T4 | Map component | Google Maps integration | @react-google-maps/api | 2 |
| E5-T5 | Live tracking view | Real-time location on map | React, SWR polling | 2 |
| E5-T6 | Route history | Polyline showing travel path | Google Maps API | 1 |
| E5-T7 | Timeline component | Chronological location events | React | 1 |
| E5-T8 | Public tracking page | /track/{code} shareable view | Next.js | 2 |
| E5-T9 | Label activation | QR scan → activate label API | API Routes | 1 |

**Deliverables:**
- [ ] Device API receiving location data
- [ ] Map showing live location
- [ ] Route history visualization
- [ ] Public tracking page working

---

##### Epic 6: Payment & Order Processing
**Goal:** Implement Stripe checkout and order management  
**Estimate:** 10 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E6-T1 | Stripe setup | Create Stripe account, API keys | Stripe Dashboard | 1 |
| E6-T2 | Product catalog | Create label products in Stripe | Stripe Products | 1 |
| E6-T3 | Checkout flow | Stripe Checkout session creation | Stripe, Next.js API | 2 |
| E6-T4 | Success/cancel pages | Post-checkout redirect handling | Next.js | 1 |
| E6-T5 | Webhook handler | Handle payment events (success, fail) | Stripe Webhooks | 2 |
| E6-T6 | Order creation | Create order in DB on payment success | Prisma | 1 |
| E6-T7 | Order confirmation email | Send confirmation after purchase | Resend | 1 |
| E6-T8 | Order history API | Endpoint to fetch user's orders | Next.js API | 1 |

**Deliverables:**
- [ ] Working Stripe checkout
- [ ] Order stored in database
- [ ] Confirmation email sent
- [ ] Order history visible in dashboard

---

#### MONTH 3: Admin, Notifications & Launch (Weeks 9-12)

---

##### Epic 7: Admin Panel
**Goal:** Build internal operations panel for HyperLabel team  
**Estimate:** 10 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E7-T1 | Admin auth | Admin role check, protected routes | Clerk Roles | 1 |
| E7-T2 | Admin layout | Separate admin UI layout | Next.js, Tailwind | 1 |
| E7-T3 | User management | List/search/view users | TanStack Table | 2 |
| E7-T4 | Label inventory | Track label stock, IMEI, status | React, API | 2 |
| E7-T5 | Order management | View/filter orders, mark shipped | TanStack Table | 2 |
| E7-T6 | Device health | View device status, last ping, battery | React, API | 1 |
| E7-T7 | Support lookup | Search shipment by ID/email | API | 1 |

**Deliverables:**
- [ ] Admin panel at /admin
- [ ] User management
- [ ] Order management
- [ ] Label inventory tracking

---

##### Epic 8: Notifications
**Goal:** Implement email notifications for key events  
**Estimate:** 8 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E8-T1 | Email service setup | Configure Resend for transactional email | Resend | 1 |
| E8-T2 | Email templates | Design email templates (React Email) | React Email | 2 |
| E8-T3 | Label activated | Send email when label starts transmitting | Resend, Trigger | 1 |
| E8-T4 | Low battery alert | Send email at 20% and 10% | Resend, Trigger | 1 |
| E8-T5 | No signal alert | Send email after 24h no transmission | Cron job, Resend | 1 |
| E8-T6 | Share link reminders | 1-3 emails if link not activated | Cron job, Resend | 1 |
| E8-T7 | Notification prefs | User can toggle notifications | React, API | 1 |

**Deliverables:**
- [ ] Email notifications working
- [ ] User can manage notification preferences
- [ ] Activation reminders sending

---

##### Epic 9: Testing, QA & Launch
**Goal:** Test, fix bugs, and deploy to production  
**Estimate:** 10 hours

| ID | Task | Description | Tools | Hours |
|----|------|-------------|-------|-------|
| E9-T1 | End-to-end testing | Test full user flows | Manual testing | 2 |
| E9-T2 | Device integration test | Test with real hardware (Andrii) | Real device | 2 |
| E9-T3 | Security review | Check auth, API security, HTTPS | Manual review | 1 |
| E9-T4 | Performance check | Load testing, optimize slow queries | Cloud Monitoring, PostHog | 1 |
| E9-T5 | Bug fixes | Fix issues found in testing | Various | 2 |
| E9-T6 | Production deploy | Deploy to production, DNS setup | Firebase Hosting, Cloud Run, Cloudflare | 1 |
| E9-T7 | Documentation | API docs, user guide | Notion/README | 1 |

**Deliverables:**
- [ ] All critical flows tested
- [ ] Production deployment live
- [ ] Documentation published

---

---

#### FULL SUMMARY: Hours by Epic

##### Product & Business Epics

| Epic | Description | Hours | Month | Deadline |
|------|-------------|-------|-------|----------|
| **P1** | User Research - Preparation | 20 | 1 | |
| **P2** | Investor Materials | 50 | 1 | ⚠️ **06 Feb 2026** |
| **P3** | User Research - Conducting | 40 | 2 | |
| **P4** | Grant Application | 30 | 1-2 | TBD |
| **P5** | User Research - Analysis | 20 | 3 | |
| **P6** | Product Management | 69 | 1-3 | Ongoing |
| | **Subtotal (Product)** | **229** | | |

##### Technical Epics (Development)

| Epic | Description | Hours | Month |
|------|-------------|-------|-------|
| **E1** | Project Setup & Infrastructure | 10 | 1 |
| **E2** | Authentication & User Management | 12 | 1 |
| **E3** | Landing Page | 10 | 1 |
| **E4** | Customer Portal & Dashboard | 14 | 2 |
| **E5** | Tracking Features & Device Integration | 14 | 2 |
| **E6** | Payment & Order Processing | 10 | 2 |
| **E7** | Admin Panel | 10 | 3 |
| **E8** | Notifications | 8 | 3 |
| **E9** | Testing, QA & Launch | 10 | 3 |
| | **Subtotal (Tech)** | **98** | |

##### Grand Total

| Category | Hours | % |
|----------|-------|---|
| Product & Business | 229 | 70% |
| Technical Development | 100 | 30% |
| **TOTAL** | **329** | 100% |

---

#### WEEKLY BREAKDOWN

##### Week 1: Jan 26-31 (5 working days) — 35 hours

| Epic | Focus | Hours | Priority |
|------|-------|-------|----------|
| **P2** | Investor Materials — START | 28 | 🔴 CRITICAL |
| **P6** | Product Management | 7 | |
| | **Week 1 Total** | **35** | |

**Focus:** 80% on investor materials (market research, start financial model)

**Sprint 1 Deliverables:**
- [ ] Market research complete (TAM/SAM/SOM)
- [ ] Competitive analysis done
- [ ] Financial model structure started
- [ ] Teaser draft started

---

## SPRINT 1: DETAILED TASK SPECIFICATIONS

**Sprint:** 1 of 10  
**Dates:** January 26-31, 2026 (5 working days)  
**Capacity:** 35 hours  
**Sprint Goal:** Complete market research and competitive analysis; begin financial model and teaser document to meet Feb 6 investor materials deadline.

---

### P2-T1: Market Research (TAM/SAM/SOM)

**Type:** Research  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 8 hours  
**Assignee:** Denys Chumak

#### Summary
Conduct comprehensive market research to quantify the Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM) for the cargo tracking label industry. This data is essential for the investor pitch and financial projections.

#### User Story
**As an** investor reviewing HyperLabel,  
**I want to** understand the market size and opportunity,  
**So that** I can assess the potential return on investment and growth ceiling.

#### Why This Matters
- Investors need market size to evaluate opportunity scale
- TAM/SAM/SOM demonstrates we understand our market
- Data feeds directly into financial model revenue projections
- Differentiates us from competitors who may not have rigorous analysis

#### What We Will Implement

**1. Total Addressable Market (TAM)**
- Global cargo tracking market size (2024-2030)
- IoT asset tracking market
- Smart label / disposable tracker segment
- Geographic breakdown (US, EU, APAC)

**2. Serviceable Addressable Market (SAM)**
- B2B cargo tracking (excluding consumer parcels)
- Target cargo types: electronics, manufacturing, pharma, air cargo
- Companies shipping internationally
- Price point alignment ($20-30 labels)

**3. Serviceable Obtainable Market (SOM)**
- Realistic Year 1-3 capture rate
- Based on comparable startup growth rates
- Geographic focus (US, UK initially)

**4. Market Trends**
- Growth drivers (e-commerce, supply chain visibility)
- Regulatory factors (EU supply chain due diligence)
- Technology enablers (LTE Cat-1, eSIM)

#### Research Sources
- Statista, Grand View Research, MarketsandMarkets
- McKinsey / Bain logistics reports (free summaries)
- Competitor funding announcements (Tive, Roambee)
- Industry associations (IATA, IMO for shipping volumes)
- Government trade data (US Census, Eurostat)

#### Acceptance Criteria

- [ ] **TAM documented** with source citations and methodology
  - Global market size with CAGR
  - Minimum 3 credible sources
  
- [ ] **SAM calculated** with clear segmentation logic
  - Target segments quantified
  - Geographic scope defined
  
- [ ] **SOM projected** for Years 1-3
  - Assumptions clearly stated
  - Conservative, base, optimistic scenarios
  
- [ ] **Data formatted** for investor deck
  - Single-page summary chart
  - Supporting detail document
  
- [ ] **Competitive market context** included
  - How big are competitors (if known)
  - Market share estimates

#### Output Format

```
📊 Market Research Document (Google Docs)
├── Executive Summary (1 page)
├── TAM Analysis
│   ├── Global cargo tracking market: $X.XB (2024) → $X.XB (2030)
│   ├── CAGR: X.X%
│   └── Sources: [list]
├── SAM Analysis  
│   ├── B2B international cargo: $X.XB
│   ├── Target segments: [breakdown]
│   └── Methodology
├── SOM Projection
│   ├── Year 1: $XXk (X labels)
│   ├── Year 2: $XXXk (X labels)
│   ├── Year 3: $X.XM (X labels)
│   └── Assumptions
└── Market Trends (bullet points)
```

#### Definition of Done
- [ ] Document reviewed by Andrii (founder) for alignment
- [ ] Numbers cross-validated with at least 2 sources
- [ ] Ready to copy into investor deck and financial model

---

### P2-T2: Competitive Analysis

**Type:** Research  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 4 hours  
**Assignee:** Denys Chumak

#### Summary
Create detailed competitive landscape analysis showing how HyperLabel differentiates from existing cargo tracking solutions. This analysis will support the investor pitch by demonstrating market understanding and competitive positioning.

#### User Story
**As an** investor evaluating HyperLabel,  
**I want to** understand the competitive landscape and HyperLabel's differentiation,  
**So that** I can assess whether the company can win market share.

#### Why This Matters
- Investors always ask "Who are your competitors?"
- Shows we understand the market deeply
- Highlights our unique value proposition
- Identifies potential threats and barriers

#### What We Will Implement

**1. Direct Competitor Profiles**
For each competitor document:
- Company overview (founded, HQ, funding)
- Product offering (device specs, features)
- Pricing model
- Target market
- Strengths and weaknesses
- Recent news/funding

**Competitors to Analyze:**
| Competitor | Type | Priority |
|------------|------|----------|
| Tive | Reusable tracker | 🔴 High |
| Roambee | Reusable tracker | 🔴 High |
| Sensos | Smart label | 🔴 High |
| SODAQ | Smart label | 🟡 Medium |
| G+D Smart Label | Smart label | 🟡 Medium |
| Reelables | Disposable | 🔴 High |
| Controlant | Cold chain | 🟡 Medium |

**2. Competitive Positioning Matrix**
- X-axis: Price (Low → High)
- Y-axis: Complexity (Simple → Enterprise)
- Plot all competitors + HyperLabel

**3. Feature Comparison Table**
| Feature | HyperLabel | Tive | Roambee | Sensos | Reelables |
|---------|------------|------|---------|--------|-----------|
| Price | $20-25 | $150+ | $200+ | €50+ | $15-25 |
| Form Factor | 3.5mm | Bulky | Bulky | Thin | Thin |
| Battery | 60 days | 90+ days | 90+ days | 30 days | 45 days |
| Reusable | No | Yes | Yes | Yes | No |
| Setup | QR scan | Complex | Complex | Medium | QR scan |

**4. HyperLabel Differentiation**
- Price advantage (vs reusable trackers)
- Simplicity advantage (vs enterprise solutions)
- Coverage advantage (180+ countries, eSIM)
- UX advantage (consumer-grade)

#### Research Sources
- Competitor websites
- G2, Capterra reviews
- Crunchbase, PitchBook (funding data)
- LinkedIn (team size estimates)
- Press releases, blog posts
- YouTube demos

#### Acceptance Criteria

- [ ] **7+ competitors profiled** with key data points
  - Funding, pricing, features, target market
  
- [ ] **Positioning matrix created** (visual)
  - Clear quadrant showing HyperLabel position
  
- [ ] **Feature comparison table** completed
  - Minimum 8 comparison dimensions
  
- [ ] **Competitive advantages articulated**
  - 3-5 clear differentiators with evidence
  
- [ ] **Threats identified**
  - What could competitors do to counter us?

#### Output Format

```
📊 Competitive Analysis Document (Google Docs)
├── Executive Summary
├── Competitor Profiles (1 page each)
│   ├── Tive
│   ├── Roambee
│   ├── Sensos
│   └── [others]
├── Positioning Matrix (visual)
├── Feature Comparison Table
├── HyperLabel Differentiation
│   ├── Price: "50-80% cheaper than reusable trackers"
│   ├── Simplicity: "Consumer-grade UX, no training"
│   └── Coverage: "Works in 180+ countries"
└── Competitive Risks & Mitigation
```

#### Definition of Done
- [ ] All major competitors covered
- [ ] Visuals ready for investor deck
- [ ] Andrii reviewed for accuracy

---

### P2-T3: Teaser Document (1-Pager)

**Type:** Document Creation  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 4 hours (START in Sprint 1, finish in Sprint 2)  
**Assignee:** Denys Chumak

#### Summary
Create a compelling 1-page teaser document that serves as the initial outreach material for investors. This document should capture attention, communicate the opportunity, and prompt investors to request more information.

#### User Story
**As an** angel investor or VC receiving cold outreach,  
**I want to** quickly understand what HyperLabel does and why it's interesting,  
**So that** I can decide whether to take a meeting in under 60 seconds.

#### Why This Matters
- First impression with investors
- Gets sent via email before meetings
- Must be scannable and compelling
- Differentiates from hundreds of other pitches

#### What We Will Implement

**Teaser Structure (1 page, PDF):**

```
┌─────────────────────────────────────────┐
│ [LOGO] HyperLabel                       │
│ "Track Any Cargo, Anywhere"             │
├─────────────────────────────────────────┤
│ THE PROBLEM                             │
│ • $X billion lost annually to...        │
│ • Cargo goes dark during transit        │
│ • Existing solutions cost $150+         │
├─────────────────────────────────────────┤
│ THE SOLUTION                            │
│ [Product image]                         │
│ $20 disposable LTE tracking label       │
│ • 60-day battery                        │
│ • 180+ countries                        │
│ • Scan, peel, stick                     │
├─────────────────────────────────────────┤
│ MARKET OPPORTUNITY                      │
│ TAM: $XXB | SAM: $XXB | SOM: $XXM       │
├─────────────────────────────────────────┤
│ TRACTION / MILESTONES                   │
│ ✓ Hardware prototype complete           │
│ ✓ Platform MVP in development           │
│ ○ First pilot shipments Q1 2026         │
├─────────────────────────────────────────┤
│ TEAM                                    │
│ [Photo] Andrii T. - Founder (Hardware)  │
│ [Photo] Denys C. - Product              │
├─────────────────────────────────────────┤
│ THE ASK                                 │
│ Raising £XXXk seed for...               │
│ Contact: andrii@hyperlabel.com          │
└─────────────────────────────────────────┘
```

#### Design Requirements
- Clean, professional design (not cluttered)
- Brand colors: Dark (#0f172a), Green accent (#c4f534)
- High-quality product image
- Scannable with clear hierarchy
- PDF format, < 2MB

#### Acceptance Criteria

- [ ] **Single page** (no scrolling)
  - A4 or US Letter format
  
- [ ] **All key sections included**
  - Problem, Solution, Market, Traction, Team, Ask
  
- [ ] **Numbers from market research** used
  - TAM/SAM/SOM figures
  
- [ ] **Compelling hook** in first 3 seconds
  - Strong headline and problem statement
  
- [ ] **Clear call to action**
  - Contact info, next step
  
- [ ] **Proofread** - zero typos

#### Output Format
- Google Doc (editable version)
- PDF (shareable version)
- PNG (for email embedding)

#### Definition of Done
- [ ] Andrii approved content and positioning
- [ ] Designer (Andrii P.) reviewed layout (if available)
- [ ] Sent to 1 test recipient for feedback

---

### P2-T4: Financial Model - Revenue Projections

**Type:** Financial Modeling  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 8 hours (START in Sprint 1: 4h, finish Sprint 2: 4h)  
**Assignee:** Denys Chumak

#### Summary
Build the revenue projection section of the financial model, including pricing scenarios, sales forecasts, and growth assumptions for Years 1-5.

#### User Story
**As an** investor reviewing the financial model,  
**I want to** see realistic revenue projections with clear assumptions,  
**So that** I can evaluate the growth potential and path to profitability.

#### Why This Matters
- Core of investor due diligence
- Shows we understand our business model
- Basis for valuation discussions
- Demonstrates market opportunity capture

#### What We Will Implement

**1. Pricing Model**
| Product | Price | Margin | Notes |
|---------|-------|--------|-------|
| Single label | $25 | ~50% | Entry point |
| 5-pack | $110 ($22 ea) | ~55% | Volume discount |
| 10-pack | $200 ($20 ea) | ~60% | Best value |
| Enterprise | Custom | TBD | Post-MVP |

**2. Revenue Streams**
- MVP: Label sales only
- Future: Premium subscriptions, API access

**3. Sales Forecast (Monthly)**

Year 1 (MVP Launch):
| Month | Labels Sold | Revenue | Cumulative |
|-------|-------------|---------|------------|
| M1 | 10 | $250 | $250 |
| M2 | 20 | $480 | $730 |
| M3 | 35 | $800 | $1,530 |
| ... | ... | ... | ... |
| M12 | 200 | $4,400 | $25,000 |

**4. Growth Assumptions**
- Month-over-month growth rate: X%
- Customer acquisition channels
- Conversion rates
- Repeat purchase rate (B2B reorders)

**5. Scenario Analysis**
- Conservative: 50% of base
- Base case: Primary forecast
- Optimistic: 150% of base

#### Acceptance Criteria

- [ ] **5-year revenue projection** completed
  - Monthly for Year 1, quarterly for Years 2-3, annual for Years 4-5
  
- [ ] **Assumptions documented** and adjustable
  - Each assumption in separate cell
  - Sensitivity analysis possible
  
- [ ] **3 scenarios** modeled
  - Conservative, Base, Optimistic
  
- [ ] **Charts created** for deck
  - Revenue growth chart
  - MRR/ARR chart (if subscription added)
  
- [ ] **Unit economics preview**
  - Revenue per label
  - Average order value

#### Output Format

```
📊 Financial Model (Google Sheets)
├── Tab: Assumptions
│   ├── Pricing
│   ├── Growth rates
│   └── Conversion rates
├── Tab: Revenue Model
│   ├── Monthly forecast (Y1)
│   ├── Quarterly forecast (Y2-3)
│   └── Annual forecast (Y4-5)
├── Tab: Scenarios
│   ├── Conservative
│   ├── Base
│   └── Optimistic
└── Tab: Charts
    ├── Revenue growth
    └── Labels sold
```

#### Definition of Done
- [ ] Model is formula-driven (no hardcoded numbers)
- [ ] Assumptions are realistic and documented
- [ ] Charts ready to paste into investor deck

---

### P6-T1: Weekly Sync with Andrii (Founder)

**Type:** Meeting  
**Epic:** P6 - Product Management  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours (1h meeting + 1h prep/notes)  
**Assignee:** Denys Chumak

#### Summary
Conduct weekly alignment meeting with Andrii (founder) to review progress, make decisions, and ensure hardware/software alignment.

#### User Story
**As the** founder of HyperLabel,  
**I want to** have regular updates on product and investor material progress,  
**So that** I can provide input, remove blockers, and stay aligned.

#### Meeting Agenda (Week 1)

1. **Progress Review** (15 min)
   - Market research status
   - Competitive analysis findings
   - Financial model structure

2. **Decisions Needed** (20 min)
   - Validate TAM/SAM/SOM numbers
   - Confirm pricing strategy for model
   - Teaser content approval

3. **Hardware Update** (10 min)
   - Device development status
   - API readiness timeline
   - First samples availability

4. **Blockers & Risks** (10 min)
   - Any issues discovered
   - Resource needs

5. **Next Week Priorities** (5 min)
   - Align on Sprint 2 focus

#### Acceptance Criteria

- [ ] **Meeting scheduled** for Week 1
- [ ] **Agenda sent** 24h in advance
- [ ] **Notes documented** within 24h
- [ ] **Action items** tracked with owners
- [ ] **Key decisions** recorded

#### Output
- Meeting notes (Google Doc)
- Updated task priorities if needed

---

### P6-T2: Spec Document Updates

**Type:** Documentation  
**Epic:** P6 - Product Management  
**Priority:** 🟡 Medium  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Summary
Keep the SPEC.md document updated with any new information, decisions, or changes discovered during Sprint 1 research.

#### User Story
**As a** team member or future developer,  
**I want to** have an up-to-date specification document,  
**So that** I can understand the current state of product decisions.

#### Updates Expected This Sprint
- [ ] Market size data (from P2-T1)
- [ ] Updated competitor information (from P2-T2)
- [ ] Any pricing changes
- [ ] Hardware specs updates (from Andrii sync)
- [ ] Timeline adjustments

#### Acceptance Criteria

- [ ] **SPEC.md updated** with Sprint 1 findings
- [ ] **Version number** incremented
- [ ] **Last Updated date** current
- [ ] **Changes committed** to GitHub
- [ ] **HTML version deployed** to GitHub Pages

---

### P6-T3: Linear Project Setup

**Type:** Infrastructure  
**Epic:** P6 - Product Management  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Set up Linear project with proper structure, cycles, and labels to track all MVP work.

#### User Story
**As the** product manager and developer,  
**I want to** have a structured task tracking system,  
**So that** I can manage work efficiently and report progress.

#### What We Will Implement

**1. Project Structure**
```
Workspace: HyperLabel
└── Project: MVP Launch
    ├── Cycle: Sprint 1 (Jan 26-31)
    ├── Cycle: Sprint 2 (Feb 1-14)
    ├── ...
    └── Backlog
```

**2. Labels**
- `type:feature` - New functionality
- `type:research` - Research tasks
- `type:docs` - Documentation
- `type:infra` - Infrastructure
- `type:bug` - Bug fixes
- `priority:critical` - Must do
- `priority:high` - Should do
- `priority:medium` - Could do
- `epic:P1` through `epic:P6` - Product epics
- `epic:E1` through `epic:E9` - Technical epics

**3. Custom Fields**
- Hours Estimate
- Hours Actual
- Sprint (cycle)

**4. Views**
- Board view (Kanban)
- Sprint view (current cycle)
- My Tasks

#### Acceptance Criteria

- [ ] **Linear workspace created**
- [ ] **All Sprint 1 tasks entered** with descriptions
- [ ] **Labels configured**
- [ ] **Sprint 1 cycle created** and active
- [ ] **Workflow configured** (Backlog → Todo → In Progress → Done)

---

## SPRINT 1 SUMMARY

| Task ID | Task Name | Hours | Day(s) | Dependency |
|---------|-----------|-------|--------|------------|
| P2-T1 | Market Research (TAM/SAM/SOM) | 8 | Mon-Tue | None |
| P2-T2 | Competitive Analysis | 4 | Tue-Wed | None |
| P2-T3 | Teaser (1-Pager) - START | 2 | Wed | P2-T1, P2-T2 |
| P2-T4 | Financial Model - Revenue - START | 4 | Thu-Fri | P2-T1 |
| P6-T1 | Weekly Sync with Andrii | 2 | Wed or Thu | None |
| P6-T2 | Spec Document Updates | 3 | Ongoing | P2-T1, P2-T2 |
| P6-T3 | Linear Project Setup | 2 | Mon | None |
| | **TOTAL** | **25** | | |
| | **Buffer** | **10** | | |
| | **Sprint Capacity** | **35** | | |

**Sprint 1 Success Criteria:**
1. ✅ TAM/SAM/SOM numbers validated and documented
2. ✅ 7+ competitors analyzed with positioning matrix
3. ✅ Teaser document drafted (may need polish in Sprint 2)
4. ✅ Financial model revenue section started
5. ✅ Linear set up and all tasks tracked

---

## SPRINT 2: DETAILED TASK SPECIFICATIONS

**Sprint:** 2 of 10  
**Dates:** February 1-14, 2026 (10 working days)  
**Capacity:** 70 hours  
**Sprint Goal:** COMPLETE investor materials by Feb 6 deadline; prepare for user research; start grant application and dev environment setup.

⚠️ **CRITICAL DEADLINE: February 6, 2026** — All investor materials (Teaser, Financial Model, Business Plan) must be complete and delivered to Andrii.

---

### P2-T3: Teaser Document (1-Pager) - FINISH

**Type:** Document Creation  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 2 hours (finishing work from Sprint 1)  
**Deadline:** ⚠️ February 6, 2026  
**Assignee:** Denys Chumak

#### Summary
Complete and polish the 1-page teaser document started in Sprint 1. Finalize design, ensure all numbers are accurate, and prepare for distribution.

#### User Story
**As an** angel investor receiving this teaser via email,  
**I want to** quickly understand HyperLabel's opportunity in under 60 seconds,  
**So that** I can decide whether to request a meeting or full deck.

#### Remaining Work
- [ ] Incorporate final TAM/SAM/SOM numbers from research
- [ ] Add team photos (get from Andrii)
- [ ] Finalize "The Ask" section (confirm raise amount with Andrii)
- [ ] Design polish (spacing, fonts, colors)
- [ ] Export to PDF
- [ ] Create PNG version for email embedding

#### Acceptance Criteria

- [ ] **All sections complete** with accurate data
- [ ] **Design approved** by Andrii
- [ ] **PDF version** < 2MB, looks good on screen and print
- [ ] **Zero typos** — proofread by 2 people
- [ ] **Contact info** correct and working

#### Definition of Done
- [ ] PDF delivered to Andrii
- [ ] Stored in shared Google Drive folder
- [ ] Ready to send to investors

---

### P2-T4: Financial Model - Revenue (FINISH)

**Type:** Financial Modeling  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 4 hours (finishing work from Sprint 1)  
**Deadline:** ⚠️ February 6, 2026  
**Assignee:** Denys Chumak

#### Summary
Complete the revenue projections section of the financial model. Finalize assumptions, create all three scenarios, and generate charts.

#### Remaining Work
- [ ] Finalize Year 1 monthly projections
- [ ] Complete Years 2-5 projections
- [ ] Build Conservative / Base / Optimistic scenarios
- [ ] Create revenue growth chart
- [ ] Link to cost model (P2-T5)

#### Acceptance Criteria

- [ ] **5-year projection complete** with monthly/quarterly detail
- [ ] **All assumptions documented** in separate tab
- [ ] **3 scenarios** with clear differences
- [ ] **Charts** ready to paste into deck
- [ ] **Formula-driven** (no hardcoded numbers except assumptions)

---

### P2-T5: Financial Model - Costs & Operations

**Type:** Financial Modeling  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 6 hours  
**Deadline:** ⚠️ February 6, 2026  
**Assignee:** Denys Chumak

#### Summary
Build the cost structure section of the financial model, including COGS (Cost of Goods Sold), operating expenses, and hiring plan.

#### User Story
**As an** investor analyzing the financial model,  
**I want to** understand the cost structure and path to profitability,  
**So that** I can assess capital efficiency and runway requirements.

#### Why This Matters
- Investors need to see realistic cost assumptions
- Shows we understand our unit economics
- Determines funding requirements
- Highlights path to breakeven

#### What We Will Implement

**1. Cost of Goods Sold (COGS)**
| Cost Component | Per Unit | Notes |
|----------------|----------|-------|
| Hardware (label) | $8-10 | From Andrii |
| eSIM/data | $2-3 | 60 days LTE |
| Packaging | $0.50 | Box, quick-start guide |
| Shipping to warehouse | $0.50 | China to fulfillment |
| **Total COGS** | **$11-14** | |
| **Gross Margin** | **45-55%** | At $25 price |

**2. Operating Expenses (Monthly)**
| Category | MVP | Month 6 | Month 12 |
|----------|-----|---------|----------|
| Cloud infrastructure | $50 | $200 | $500 |
| SaaS tools | $100 | $300 | $500 |
| Marketing | $0 | $500 | $2,000 |
| Legal/accounting | $200 | $300 | $500 |
| **Total OpEx** | **$350** | **$1,300** | **$3,500** |

**3. Team Costs**
| Role | Start | Monthly Cost | When |
|------|-------|--------------|------|
| Andrii (Founder) | M1 | £0 (equity) | Ongoing |
| Denys (PM/Dev) | M1 | £5,500 | M1-M3 (contract) |
| Designer | M1 | £1,200 | M1-M3 (contract) |
| Full-time dev | M6 | £5,000 | Post-MVP |
| Support | M9 | £2,500 | Scale phase |

**4. Profitability Analysis**
- Breakeven point (units)
- Months to profitability
- Cash runway calculation

#### Acceptance Criteria

- [ ] **COGS breakdown** completed with per-unit costs
  - Validated with Andrii on hardware costs
  
- [ ] **OpEx projections** for 3 years
  - Monthly for Year 1, quarterly for Year 2-3
  
- [ ] **Hiring plan** aligned with roadmap
  - When each role joins
  - Cost assumptions documented
  
- [ ] **Breakeven analysis** completed
  - Units needed to break even
  - Timeline projection
  
- [ ] **Linked to revenue model**
  - P&L summary calculates automatically

#### Output Format

```
📊 Financial Model (continued)
├── Tab: COGS
│   ├── Per-unit breakdown
│   ├── Volume discounts (future)
│   └── Gross margin by product
├── Tab: OpEx
│   ├── Infrastructure costs
│   ├── SaaS/tools
│   ├── Marketing
│   └── G&A
├── Tab: Team
│   ├── Hiring timeline
│   ├── Salary assumptions
│   └── Total payroll by month
└── Tab: P&L Summary
    ├── Revenue (from revenue model)
    ├── COGS
    ├── Gross Profit
    ├── OpEx
    ├── EBITDA
    └── Net Income
```

#### Definition of Done
- [ ] All costs validated with Andrii
- [ ] Model balances (no errors)
- [ ] Summary P&L generated

---

### P2-T6: Financial Model - Unit Economics

**Type:** Financial Modeling  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 4 hours  
**Deadline:** ⚠️ February 6, 2026  
**Assignee:** Denys Chumak

#### Summary
Calculate and document key unit economics metrics that investors use to evaluate business viability.

#### User Story
**As an** investor evaluating HyperLabel,  
**I want to** see clear unit economics (CAC, LTV, margins),  
**So that** I can assess whether the business model is sustainable at scale.

#### Key Metrics to Calculate

**1. Customer Acquisition Cost (CAC)**
```
CAC = Total Marketing Spend / New Customers Acquired

MVP Phase (organic): ~$0-50/customer
Growth Phase (paid): ~$100-200/customer
```

**2. Lifetime Value (LTV)**
```
LTV = Average Order Value × Purchase Frequency × Customer Lifespan

Assumptions:
- AOV: $50 (avg 2 labels)
- Frequency: 4x/year (B2B reorders)
- Lifespan: 3 years
- LTV = $50 × 4 × 3 = $600
```

**3. LTV:CAC Ratio**
```
Target: >3:1 (healthy SaaS benchmark)
HyperLabel: $600 / $150 = 4:1 ✓
```

**4. Gross Margin per Label**
```
Revenue: $25
COGS: $12
Gross Profit: $13
Gross Margin: 52%
```

**5. Contribution Margin**
```
Revenue: $25
COGS: $12
Variable costs: $1 (transaction fees)
Contribution: $12 (48%)
```

**6. Payback Period**
```
Payback = CAC / (Monthly Revenue per Customer × Gross Margin)
= $150 / ($17 × 0.52)
= 17 months
```

#### Acceptance Criteria

- [ ] **CAC calculated** with assumptions documented
- [ ] **LTV calculated** with realistic assumptions
- [ ] **LTV:CAC ratio** > 3:1 demonstrated
- [ ] **Payback period** calculated
- [ ] **Gross margin** by product tier
- [ ] **Single-page summary** for investor deck

#### Definition of Done
- [ ] All calculations verified
- [ ] Assumptions are defensible
- [ ] Visual chart ready for deck

---

### P2-T7: Business Plan - Strategy Section

**Type:** Document Creation  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 6 hours  
**Deadline:** ⚠️ February 6, 2026  
**Assignee:** Denys Chumak

#### Summary
Write the strategy section of the business plan covering go-to-market strategy, growth strategy, and competitive positioning.

#### User Story
**As an** investor reading the business plan,  
**I want to** understand how HyperLabel will acquire customers and grow,  
**So that** I can evaluate the execution strategy.

#### What We Will Implement

**1. Go-to-Market Strategy**

*Phase 1: Founder-led Sales (M1-6)*
- Direct outreach to freight forwarders
- LinkedIn + email campaigns
- Andrii's industry network
- Target: 10 paying customers

*Phase 2: Inbound Marketing (M6-12)*
- Content marketing (logistics pain points)
- SEO for "cargo tracking" keywords
- Partnership with freight platforms
- Target: 50 paying customers

*Phase 3: Channel Sales (Year 2)*
- Freight forwarder partnerships
- 3PL integrations
- White-label opportunities

**2. Customer Acquisition Channels**
| Channel | Cost | Expected CAC | Volume |
|---------|------|--------------|--------|
| Founder network | Free | $0 | Low |
| LinkedIn outreach | $50/mo | $100 | Medium |
| Google Ads | $500/mo | $200 | Medium |
| Content/SEO | $200/mo | $50 | High (long-term) |
| Partnerships | Rev share | $150 | High |

**3. Pricing Strategy**
- Penetration pricing: Start at $20-25 (below competitors)
- Value-based tiers: Single, 5-pack, 10-pack
- Future: Enterprise custom pricing

**4. Competitive Positioning**
- Position: "The affordable, simple cargo tracker"
- Against Tive/Roambee: 80% cheaper, no contracts
- Against Reelables: Better global coverage, more features
- Avoid: Enterprise features (not our market)

**5. Geographic Expansion**
- Year 1: US (primary), UK (secondary)
- Year 2: EU (Germany, Netherlands, France)
- Year 3: APAC (Singapore, Australia)

#### Acceptance Criteria

- [ ] **GTM strategy** clearly articulated
  - Phase 1, 2, 3 with timelines
  
- [ ] **Channel strategy** with CAC estimates
  - Ranked by efficiency
  
- [ ] **Pricing rationale** documented
  - Why these price points
  
- [ ] **Competitive positioning** statement
  - How we win against each competitor type
  
- [ ] **Geographic plan** with reasoning

#### Output Format
```
📄 Business Plan - Strategy (Google Docs)
├── 1. Executive Summary
├── 2. Go-to-Market Strategy
│   ├── Phase 1: Founder-led Sales
│   ├── Phase 2: Inbound Marketing
│   └── Phase 3: Channel Sales
├── 3. Customer Acquisition
├── 4. Pricing Strategy
├── 5. Competitive Positioning
└── 6. Geographic Expansion
```

---

### P2-T8: Business Plan - Operations Section

**Type:** Document Creation  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 4 hours  
**Deadline:** ⚠️ February 6, 2026  
**Assignee:** Denys Chumak

#### Summary
Write the operations section covering team, milestones, risks, and use of funds.

#### User Story
**As an** investor deciding whether to fund HyperLabel,  
**I want to** understand the team, execution plan, and risks,  
**So that** I can assess whether the team can execute on the opportunity.

#### What We Will Implement

**1. Team Overview**
- Current team with backgrounds
- Key hires planned
- Advisory board (if any)
- Gaps and how we'll fill them

**2. Milestones & Timeline**
| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Hardware prototype | Dec 2025 | ✅ Complete |
| Product spec | Jan 2026 | ✅ Complete |
| MVP platform | Mar 2026 | 🔄 In Progress |
| First paid customer | Apr 2026 | ⏳ Planned |
| 50 labels sold | Jun 2026 | ⏳ Planned |
| 10 B2B customers | Jun 2026 | ⏳ Planned |
| Series A ready | Dec 2026 | ⏳ Planned |

**3. Risk Analysis**
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Hardware delays | Medium | High | Buffer in timeline, backup supplier |
| Low demand | Medium | High | User research, pivot capability |
| Competition | Medium | Medium | Speed to market, price advantage |
| Regulatory | Low | Medium | Compliance-first approach |
| Team | Low | High | Equity incentives, clear roles |

**4. Use of Funds**
If raising £250k seed:
| Category | Amount | % |
|----------|--------|---|
| Product & Engineering | £100k | 40% |
| Hardware inventory | £50k | 20% |
| Marketing & Sales | £40k | 16% |
| Operations | £30k | 12% |
| Legal & Admin | £15k | 6% |
| Buffer | £15k | 6% |

#### Acceptance Criteria

- [ ] **Team section** complete with bios
- [ ] **Milestone timeline** with dates
- [ ] **Risk matrix** with mitigations
- [ ] **Use of funds** breakdown
- [ ] **Funding ask** confirmed with Andrii

---

### P2-T9: Investor Pitch Deck

**Type:** Presentation  
**Epic:** P2 - Investor Materials  
**Priority:** 🔴 Critical  
**Estimate:** 6 hours  
**Deadline:** ⚠️ February 6, 2026  
**Assignee:** Denys Chumak

#### Summary
Create a 12-15 slide investor pitch deck that tells the HyperLabel story compellingly.

#### User Story
**As an** investor in a pitch meeting,  
**I want to** see a clear, compelling presentation of the opportunity,  
**So that** I can make an informed investment decision.

#### Deck Structure

| Slide | Content | Key Message |
|-------|---------|-------------|
| 1 | Title | HyperLabel - Track Any Cargo, Anywhere |
| 2 | Problem | Cargo goes dark, costs billions |
| 3 | Solution | $20 disposable tracking label |
| 4 | Product Demo | How it works (3 steps) |
| 5 | Market Size | TAM/SAM/SOM |
| 6 | Business Model | How we make money |
| 7 | Traction | Milestones achieved |
| 8 | Competition | Positioning matrix |
| 9 | Go-to-Market | How we'll acquire customers |
| 10 | Team | Why we'll win |
| 11 | Financials | Revenue projection, unit economics |
| 12 | The Ask | Funding amount, use of funds |
| 13 | Appendix | Detailed financials (if needed) |

#### Design Requirements
- Clean, minimal design
- Brand colors (dark + green accent)
- One key message per slide
- Large fonts (readable from distance)
- High-quality visuals/mockups
- Consistent layout

#### Acceptance Criteria

- [ ] **12-15 slides** maximum
- [ ] **All sections covered** from structure above
- [ ] **Data from financial model** incorporated
- [ ] **Competitive matrix** from analysis included
- [ ] **Design polished** and on-brand
- [ ] **Presenter notes** added
- [ ] **PDF export** for sharing

#### Definition of Done
- [ ] Deck reviewed by Andrii
- [ ] Practice presentation delivered
- [ ] Ready for investor meetings

---

### P1-T1: Define Research Objectives

**Type:** Research Planning  
**Epic:** P1 - User Research Preparation  
**Priority:** 🟡 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Define clear research objectives and questions that need to be answered through user interviews.

#### User Story
**As the** product manager conducting user research,  
**I want to** have clear research objectives,  
**So that** every interview generates actionable insights.

#### Research Questions to Answer

**1. Problem Validation**
- Do our target users actually experience cargo visibility problems?
- How often? How painful?
- What's the cost of this problem?

**2. Current Solutions**
- What do they use today?
- What do they like/dislike?
- How much do they pay?

**3. Value Proposition**
- Is $20-25 the right price point?
- What features are must-have vs nice-to-have?
- Would they buy today?

**4. User Journey**
- Who actually attaches the label? (Shipper vs Forwarder)
- How would this fit into their workflow?
- What would block adoption?

#### Acceptance Criteria

- [ ] **Research objectives document** created
- [ ] **10-15 key questions** prioritized
- [ ] **Hypotheses to validate** listed
- [ ] **Success metrics** for research defined

---

### P1-T2: Create Interview Script

**Type:** Research Planning  
**Epic:** P1 - User Research Preparation  
**Priority:** 🟡 High  
**Estimate:** 4 hours  
**Assignee:** Denys Chumak

#### Summary
Create structured interview scripts for each persona (Consignee, Forwarder, Shipper).

#### User Story
**As an** interviewer conducting user research,  
**I want to** have a structured script with good questions,  
**So that** I get consistent, useful data from every interview.

#### Script Structure (45-60 min interview)

**1. Introduction (5 min)**
- Thank you, explain purpose
- Recording consent
- Confidentiality assurance

**2. Background (5 min)**
- Role and company
- Years in industry
- Types of cargo handled

**3. Current State (15 min)**
- How do you track shipments today?
- Walk me through a recent shipment
- What goes wrong? How often?
- What's the cost when things go wrong?

**4. Pain Points (10 min)**
- What's your biggest frustration with tracking?
- Tell me about a time tracking failed you
- How do your customers react to poor visibility?

**5. Solution Exploration (10 min)**
- Show HyperLabel concept
- Initial reaction? Questions?
- Would this solve your problem?
- What's missing?

**6. Pricing & Purchase (5 min)**
- What would you pay for this?
- Who makes the buying decision?
- What would prevent you from buying?

**7. Wrap-up (5 min)**
- Anything else to add?
- Can we follow up?
- Referrals to colleagues?

#### Acceptance Criteria

- [ ] **3 scripts created** (Consignee, Forwarder, Shipper)
- [ ] **Open-ended questions** (not leading)
- [ ] **Time estimates** per section
- [ ] **Probe questions** for each area
- [ ] **Concept test materials** prepared

---

### P1-T3: Define Recruitment Criteria

**Type:** Research Planning  
**Epic:** P1 - User Research Preparation  
**Priority:** 🟡 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Define the criteria for recruiting interview participants to ensure we talk to the right people.

#### Recruitment Criteria by Persona

**Consignee (Buyer) - 8-10 interviews**
| Criteria | Requirement |
|----------|-------------|
| Role | Procurement, Supply Chain, Operations |
| Company size | 10-500 employees |
| Industry | Electronics, manufacturing, e-commerce |
| Shipping volume | 10+ international shipments/month |
| Geography | US or UK based |
| Exclude | Current HyperLabel contacts |

**Forwarder - 4-6 interviews**
| Criteria | Requirement |
|----------|-------------|
| Role | Operations Manager, Account Manager |
| Company size | Any (freight forwarder) |
| Services | International freight |
| Volume | 50+ shipments/month |
| Geography | US, UK, or EU |

**Shipper/Logistics - 2-3 interviews**
| Criteria | Requirement |
|----------|-------------|
| Role | Operations, Fleet Manager |
| Company type | 3PL, carrier |
| Modes | Air, ocean, or trucking |
| Geography | Any |

#### Acceptance Criteria

- [ ] **Criteria documented** for each persona
- [ ] **Screening questions** created
- [ ] **Disqualification criteria** defined
- [ ] **Target numbers** set per persona

---

### P1-T4: Source Interview Candidates

**Type:** Research Execution  
**Epic:** P1 - User Research Preparation  
**Priority:** 🟡 High  
**Estimate:** 6 hours  
**Assignee:** Denys Chumak

#### Summary
Find and reach out to potential interview candidates through various channels.

#### Sourcing Channels

**1. LinkedIn Outreach**
- Search for target roles
- Personalized connection requests
- Message template with incentive offer

**2. Andrii's Network**
- Request introductions
- Existing industry contacts
- Trade show connections

**3. Online Communities**
- Reddit (r/logistics, r/supplychain)
- Industry forums
- Slack communities

**4. Respondent.io / UserInterviews.com**
- Paid recruitment service
- Pre-screened participants
- ~$100-150/interview

#### Outreach Template
```
Subject: Quick chat about cargo tracking? (£30 gift card)

Hi [Name],

I'm researching cargo tracking challenges for a new product. 
Your experience in [role] at [company] would be incredibly valuable.

Would you have 45 minutes for a video call? 
As a thank you, I'll send a £30 Amazon gift card.

No sales pitch - just want to learn from your experience.

Available times: [Calendly link]

Thanks,
Denys
```

#### Acceptance Criteria

- [ ] **50+ outreach messages** sent
- [ ] **15-20 interviews scheduled**
- [ ] **Mix of personas** achieved
- [ ] **Scheduling complete** by end of Sprint 2

---

### P4-T1: Initial Grant Consultation

**Type:** Meeting  
**Epic:** P4 - Grant Application  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Have initial consultation with Tatton Consulting to assess eligibility for UK Innovation grants.

#### User Story
**As the** team applying for grant funding,  
**I want to** understand our eligibility and requirements,  
**So that** we can prepare a strong application.

#### Meeting Agenda

1. **Company Overview**
   - Explain HyperLabel product
   - UTEC company structure
   - Current stage and traction

2. **Grant Options**
   - Innovate UK programs available
   - DASA opportunities
   - Other relevant schemes

3. **Eligibility Assessment**
   - UK company requirements
   - R&D component
   - Innovation criteria

4. **Process & Timeline**
   - Application steps
   - Required documents
   - Success rates
   - Funding timeline

5. **Next Steps**
   - What we need to prepare
   - Tatton's role
   - Costs/fees

#### Acceptance Criteria

- [ ] **Meeting completed** with Tatton
- [ ] **Eligibility confirmed** or issues identified
- [ ] **Grant options** understood
- [ ] **Timeline** established
- [ ] **Action items** documented

---

### P4-T2: Gather Company Documents

**Type:** Administration  
**Epic:** P4 - Grant Application  
**Priority:** 🟡 Medium  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak (coordination with Andrii)

#### Summary
Collect all required company documents for the grant application from Andrii/UTEC.

#### Documents Needed

| Document | Source | Status |
|----------|--------|--------|
| UTEC company registration | Andrii | ⏳ |
| Certificate of incorporation | Andrii | ⏳ |
| Latest accounts/financials | Andrii | ⏳ |
| Director details | Andrii | ⏳ |
| Proof of UK presence | Andrii | ⏳ |
| Previous grant history | Andrii | ⏳ |
| IP ownership documentation | Andrii | ⏳ |

#### Acceptance Criteria

- [ ] **All documents collected** from Andrii
- [ ] **Organized in shared folder**
- [ ] **Gaps identified** and plan to address
- [ ] **Ready for Tatton** review

---

### E1-T1: Initialize Next.js Project

**Type:** Development  
**Epic:** E1 - Project Setup & Infrastructure  
**Priority:** 🟢 Medium  
**Estimate:** 1 hour  
**Assignee:** Denys Chumak

#### Summary
Create the Next.js 14 project with TypeScript, Tailwind, and proper configuration.

#### User Story
**As a** developer starting the HyperLabel platform,  
**I need** a properly configured Next.js project,  
**So that** I can build features efficiently with modern tooling.

#### Technical Requirements

```bash
# Create project
pnpm create next-app@latest hyperlabel-platform \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# Additional dependencies
pnpm add @clerk/nextjs
pnpm add prisma @prisma/client
pnpm add stripe @stripe/stripe-js
pnpm add resend
pnpm add zod
pnpm add react-hook-form @hookform/resolvers
pnpm add @tanstack/react-query
pnpm add @tanstack/react-table
pnpm add @react-google-maps/api
pnpm add lucide-react
pnpm add class-variance-authority clsx tailwind-merge
pnpm add -D @types/node

# shadcn/ui
pnpm dlx shadcn-ui@latest init
```

#### Acceptance Criteria

- [ ] **Project created** with Next.js 14 App Router
- [ ] **TypeScript** configured with strict mode
- [ ] **Tailwind CSS** working
- [ ] **ESLint** configured
- [ ] **All dependencies** installed
- [ ] **Git repository** initialized
- [ ] **Deployed to Firebase Hosting** (preview)

---

### E1-T2: Database Setup (Cloud SQL)

**Type:** Development  
**Epic:** E1 - Project Setup & Infrastructure  
**Priority:** 🟢 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Set up PostgreSQL database on Google Cloud SQL with PostGIS extension.

#### Technical Requirements

**1. Create Cloud SQL Instance**
- Instance name: hyperlabel-db
- Region: us-central1
- Machine type: db-f1-micro (dev) / db-custom-1-3840 (prod)
- PostgreSQL 15
- Enable PostGIS extension

**2. Configure Prisma**
```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [postgis]
}
```

**3. Connection String**
```
DATABASE_URL="postgresql://user:password@/hyperlabel?host=/cloudsql/project:region:instance"
```

#### Acceptance Criteria

- [ ] **Cloud SQL instance** created
- [ ] **PostGIS extension** enabled
- [ ] **Prisma connected** successfully
- [ ] **Connection string** in .env
- [ ] **Basic migration** runs successfully

---

### P6-T4: Weekly Sync with Andrii (Week 2)

**Type:** Meeting  
**Epic:** P6 - Product Management  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours (per week, x2 in Sprint 2)  
**Assignee:** Denys Chumak

#### Summary
Weekly alignment meetings with Andrii during Sprint 2 (2 meetings).

#### Week 2 Agenda (Feb 3-7)
1. Review investor materials progress
2. Validate financial model assumptions
3. Approve teaser document
4. Hardware development update
5. Grant application status

#### Week 3 Agenda (Feb 10-14)
1. Final investor materials review
2. User research preparation status
3. Dev environment setup demo
4. Sprint 3 planning
5. Any blockers

#### Acceptance Criteria

- [ ] **2 meetings completed**
- [ ] **Notes documented**
- [ ] **Investor materials approved** by Feb 6
- [ ] **No blockers** unresolved

---

## SPRINT 2 SUMMARY

| Task ID | Task Name | Hours | Day(s) | Deadline |
|---------|-----------|-------|--------|----------|
| P2-T3 | Teaser (1-Pager) FINISH | 2 | Mon | Feb 6 |
| P2-T4 | Financial Model - Revenue FINISH | 4 | Mon-Tue | Feb 6 |
| P2-T5 | Financial Model - Costs | 6 | Tue-Wed | Feb 6 |
| P2-T6 | Financial Model - Unit Economics | 4 | Wed-Thu | Feb 6 |
| P2-T7 | Business Plan - Strategy | 6 | Thu-Fri W1 | Feb 6 |
| P2-T8 | Business Plan - Operations | 4 | Mon W2 | Feb 6 |
| P2-T9 | Investor Pitch Deck | 6 | Mon-Tue W2 | Feb 6 |
| P1-T1 | Define Research Objectives | 2 | Wed W2 | — |
| P1-T2 | Create Interview Script | 4 | Wed-Thu W2 | — |
| P1-T3 | Define Recruitment Criteria | 2 | Thu W2 | — |
| P1-T4 | Source Interview Candidates | 6 | Thu-Fri W2 | — |
| P4-T1 | Initial Grant Consultation | 2 | Flexible | — |
| P4-T2 | Gather Company Documents | 3 | Flexible | — |
| E1-T1 | Initialize Next.js Project | 1 | Fri W2 | — |
| E1-T2 | Database Setup (Cloud SQL) | 2 | Fri W2 | — |
| P6-T4 | Weekly Syncs (x2) | 4 | Wed W1, Wed W2 | — |
| P6-T5 | Spec Updates | 2 | Ongoing | — |
| | **TOTAL** | **60** | | |
| | **Buffer** | **10** | | |
| | **Sprint Capacity** | **70** | | |

**Sprint 2 Success Criteria:**
1. ✅ **ALL investor materials delivered by Feb 6** (Teaser, Financial Model, Business Plan, Deck)
2. ✅ Interview scripts ready for all personas
3. ✅ 15-20 interview candidates sourced and scheduled
4. ✅ Grant consultation completed
5. ✅ Dev environment set up and deployed to Firebase

---

## SPRINT 3: DETAILED TASK SPECIFICATIONS

**Sprint:** 3 of 10  
**Dates:** February 15-28, 2026 (10 working days)  
**Capacity:** 70 hours  
**Sprint Goal:** Conduct first batch of user interviews; complete authentication system; launch landing page draft; continue grant application.

---

### P3-T1: Consignee Interviews (8-10 interviews)

**Type:** User Research  
**Epic:** P3 - User Research Conducting  
**Priority:** 🔴 High  
**Estimate:** 15 hours (this sprint: 10h, finish Sprint 4: 5h)  
**Assignee:** Denys Chumak

#### Summary
Conduct 8-10 interviews with Consignees (cargo receivers/buyers) to validate problem, solution, and pricing assumptions.

#### User Story
**As the** product team building HyperLabel,  
**I need to** understand consignee pain points deeply,  
**So that** we build a product that solves real problems people will pay for.

#### Interview Goals
1. **Problem Validation** — Confirm cargo visibility is painful, quantify cost
2. **Current Solutions** — What they use today, what they pay
3. **Solution Fit** — Reaction to HyperLabel, must-have features
4. **Pricing Validation** — Willingness to pay $20-25/label

#### Target Profile
| Criteria | Requirement |
|----------|-------------|
| Role | Procurement, Supply Chain, Operations |
| Company | 10-500 employees |
| Industry | Electronics, manufacturing, e-commerce |
| Volume | 10+ international shipments/month |

#### Interview Process
1. Schedule via Calendly (45-60 min)
2. Send reminder 24h before
3. Record with permission (Zoom)
4. Take notes during interview
5. Send thank you + £30 gift card within 24h
6. Write summary within 48h

#### Acceptance Criteria
- [ ] **6-8 interviews completed** this sprint
- [ ] **Recordings saved** and organized
- [ ] **Notes documented** with key quotes
- [ ] **Gift cards sent** to all participants
- [ ] **Initial patterns** identified

---

### P3-T2: Forwarder Interviews (4-6 interviews)

**Type:** User Research  
**Epic:** P3 - User Research Conducting  
**Priority:** 🔴 High  
**Estimate:** 10 hours (this sprint: 6h, finish Sprint 4: 4h)  
**Assignee:** Denys Chumak

#### Summary
Conduct 4-6 interviews with Forwarders to understand their workflow and activation needs.

#### Interview Goals
1. **Workflow Understanding** — How they handle cargo, who attaches labels
2. **Technology Adoption** — Comfort with QR scanning, mobile vs desktop
3. **Value Proposition** — Would they recommend/buy for clients
4. **Activation Flow Feedback** — React to proposed flow

#### Acceptance Criteria
- [ ] **3-4 interviews completed** this sprint
- [ ] **Workflow documented**
- [ ] **Activation flow validated**

---

### P3-T4: Interview Note-Taking & Highlights

**Type:** Documentation  
**Epic:** P3 - User Research Conducting  
**Priority:** 🟡 Medium  
**Estimate:** 6 hours (ongoing)  
**Assignee:** Denys Chumak

#### Summary
Document and organize insights from all interviews.

#### Process
- Write structured summary within 48h of each interview
- Extract 3-5 key quotes per interview
- Update tracking spreadsheet
- Tag themes for later synthesis

#### Acceptance Criteria
- [ ] **All interviews documented** within 48h
- [ ] **Quotes extracted** and tagged
- [ ] **Tracking spreadsheet** current

---

### P4-T3: Technical Narrative for Grant

**Type:** Document Writing  
**Epic:** P4 - Grant Application  
**Priority:** 🟡 Medium  
**Estimate:** 5 hours  
**Assignee:** Denys Chumak

#### Summary
Write the technical innovation narrative explaining HyperLabel's R&D components.

#### Sections
1. **Technical Innovation** (2 pages) — What's new, challenges solved
2. **R&D Activities** (1 page) — Hardware + software development
3. **Technical Feasibility** (1 page) — Evidence solution works
4. **Team Capability** (0.5 page) — Why we can execute

#### Key Innovation Points
- Ultra-thin 3.5mm form factor with 60-day battery
- Offline data storage for "black hole" periods
- Global eSIM (180+ countries)
- Consumer-grade UX, price disruption

#### Acceptance Criteria
- [ ] **Technical narrative drafted** (3-4 pages)
- [ ] **Reviewed by Andrii** for hardware accuracy
- [ ] **Aligned with Tatton** requirements

---

### P4-T4: Market Opportunity Section for Grant

**Type:** Document Writing  
**Epic:** P4 - Grant Application  
**Priority:** 🟡 Medium  
**Estimate:** 4 hours  
**Assignee:** Denys Chumak

#### Summary
Write market opportunity using Sprint 1 research data.

#### Acceptance Criteria
- [ ] **Market section drafted** (1-2 pages)
- [ ] **TAM/SAM/SOM included**
- [ ] **Compelling narrative**

---

### E1-T3: Complete Database Schema

**Type:** Development  
**Epic:** E1 - Project Setup  
**Priority:** 🟢 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Finalize and implement complete Prisma schema with all models.

#### Models
- User, Label, Shipment, Location, Order, Notification
- All enums (UserRole, LabelStatus, ShipmentStatus, etc.)
- Relations and indexes

#### Acceptance Criteria
- [ ] **Schema implemented** in schema.prisma
- [ ] **Migration created** and applied
- [ ] **Prisma Client** generates without errors

---

### E2-T1: Clerk Integration

**Type:** Development  
**Epic:** E2 - Authentication  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Integrate Clerk authentication into Next.js application.

#### Implementation
1. Install @clerk/nextjs
2. Configure environment variables
3. Add ClerkProvider to layout
4. Create middleware for route protection

#### Acceptance Criteria
- [ ] **Clerk configured** and working
- [ ] **Protected routes** enforced
- [ ] **Public routes** accessible

---

### E2-T2: Sign Up Flow

**Type:** Development  
**Epic:** E2 - Authentication  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Create sign-up page with email/password and Google OAuth.

#### Acceptance Criteria
- [ ] **Sign-up page** styled to brand
- [ ] **Email/password** working
- [ ] **Google OAuth** working
- [ ] **Redirects** to dashboard

---

### E2-T3: Sign In Flow

**Type:** Development  
**Epic:** E2 - Authentication  
**Priority:** 🔴 High  
**Estimate:** 1 hour  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **Sign-in page** working
- [ ] **Forgot password** flow works
- [ ] **Consistent styling**

---

### E2-T5: Clerk Webhook for User Sync

**Type:** Development  
**Epic:** E2 - Authentication  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Create webhook to sync Clerk users to database.

#### Events to Handle
- `user.created` → Create User in DB
- `user.updated` → Update User in DB
- `user.deleted` → Soft delete User

#### Acceptance Criteria
- [ ] **Webhook endpoint** created
- [ ] **Signature verification** working
- [ ] **User sync** working for all events

---

### E3-T1: Landing Page Layout

**Type:** Development  
**Epic:** E3 - Landing Page  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Create responsive layout with navbar, footer, sections.

#### Acceptance Criteria
- [ ] **Navbar** with logo, links, CTA
- [ ] **Footer** with links, legal
- [ ] **Mobile responsive**
- [ ] **Section structure** ready

---

### E3-T2: Hero Section

**Type:** Development  
**Epic:** E3 - Landing Page  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Content
- Headline: "Track Any Cargo, Anywhere"
- Subheadline: Value proposition
- CTA buttons: Buy Labels, See Demo
- Product visual

#### Acceptance Criteria
- [ ] **Compelling headline** above fold
- [ ] **CTAs** working
- [ ] **Mobile optimized**

---

### P6-T6: Weekly Syncs (Sprint 3)

**Type:** Meeting  
**Epic:** P6 - Product Management  
**Priority:** 🟡 Medium  
**Estimate:** 4 hours (2 meetings)  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **2 meetings** completed
- [ ] **Research progress** shared
- [ ] **Demo delivered** (auth + landing draft)

---

## SPRINT 3 SUMMARY

| Task ID | Task Name | Hours | Category |
|---------|-----------|-------|----------|
| P3-T1 | Consignee Interviews (partial) | 10 | Research |
| P3-T2 | Forwarder Interviews (partial) | 6 | Research |
| P3-T4 | Interview Note-Taking | 6 | Research |
| P4-T3 | Grant Technical Narrative | 5 | Grant |
| P4-T4 | Grant Market Opportunity | 4 | Grant |
| E1-T3 | Complete Database Schema | 2 | Dev |
| E2-T1 | Clerk Integration | 2 | Dev |
| E2-T2 | Sign Up Flow | 2 | Dev |
| E2-T3 | Sign In Flow | 1 | Dev |
| E2-T5 | Clerk Webhook User Sync | 2 | Dev |
| E3-T1 | Landing Page Layout | 2 | Dev |
| E3-T2 | Hero Section | 2 | Dev |
| P6-T6 | Weekly Syncs (x2) | 4 | PM |
| P6-T7 | Spec Updates | 2 | PM |
| | **TOTAL** | **50** | |
| | **Buffer** | **20** | |

**Sprint 3 Success Criteria:**
1. ✅ 6-8 user interviews completed with notes
2. ✅ Grant technical narrative drafted
3. ✅ Authentication working end-to-end
4. ✅ Users syncing to database
5. ✅ Landing page layout and hero built

---

## SPRINT 4: DETAILED TASK SPECIFICATIONS

**Sprint:** 4 of 10  
**Dates:** March 1-14, 2026 (10 working days)  
**Capacity:** 70 hours  
**Sprint Goal:** Complete all user interviews; finish landing page; build customer portal; submit grant application; start tracking features.

---

### P3-T1: Consignee Interviews (FINISH)

**Type:** User Research  
**Epic:** P3 - User Research Conducting  
**Priority:** 🔴 High  
**Estimate:** 5 hours (remaining)  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **8-10 total interviews** completed
- [ ] **All notes documented**
- [ ] **Ready for synthesis**

---

### P3-T2: Forwarder Interviews (FINISH)

**Type:** User Research  
**Epic:** P3 - User Research Conducting  
**Priority:** 🔴 High  
**Estimate:** 4 hours (remaining)  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **4-6 total interviews** completed
- [ ] **Workflow documented**

---

### P3-T3: Shipper Interviews (2-3)

**Type:** User Research  
**Epic:** P3 - User Research Conducting  
**Priority:** 🟡 Medium  
**Estimate:** 5 hours  
**Assignee:** Denys Chumak

#### Summary
Conduct 2-3 interviews with logistics companies for industry validation.

#### Acceptance Criteria
- [ ] **2-3 interviews** completed
- [ ] **Industry perspective** captured

---

### P5-T1: Research Transcription Review

**Type:** Research Analysis  
**Epic:** P5 - User Research Analysis  
**Priority:** 🟡 Medium  
**Estimate:** 4 hours  
**Assignee:** Denys Chumak

#### Summary
Review all recordings and ensure notes are complete.

#### Acceptance Criteria
- [ ] **All recordings reviewed**
- [ ] **Quotes extracted** (5+ per interview)
- [ ] **Ready for affinity mapping**

---

### P5-T2: Affinity Mapping

**Type:** Research Analysis  
**Epic:** P5 - User Research Analysis  
**Priority:** 🟡 Medium  
**Estimate:** 4 hours  
**Assignee:** Denys Chumak

#### Summary
Group insights by theme using affinity mapping.

#### Process
1. Write insights on digital sticky notes (FigJam)
2. Group similar insights
3. Name themes
4. Prioritize by frequency

#### Acceptance Criteria
- [ ] **Affinity map created**
- [ ] **8-12 themes identified**
- [ ] **Themes prioritized**

---

### P4-T5: Grant Project Plan

**Type:** Document Writing  
**Epic:** P4 - Grant Application  
**Priority:** 🟡 Medium  
**Estimate:** 4 hours  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **Project plan drafted** (2 pages)
- [ ] **Milestones defined**
- [ ] **Aligned with Tatton**

---

### P4-T6: Grant Budget Justification

**Type:** Document Writing  
**Epic:** P4 - Grant Application  
**Priority:** 🟡 Medium  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **Budget spreadsheet** created
- [ ] **Each line justified**
- [ ] **Reviewed by Tatton**

---

### P4-T7: Grant Review & Iteration

**Type:** Review  
**Epic:** P4 - Grant Application  
**Priority:** 🟡 Medium  
**Estimate:** 4 hours  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **2+ review rounds** with Tatton
- [ ] **Application finalized**

---

### P4-T8: Grant Final Submission

**Type:** Administration  
**Epic:** P4 - Grant Application  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **Application submitted**
- [ ] **Confirmation received**

---

### E3-T3: How It Works Section

**Type:** Development  
**Epic:** E3 - Landing Page  
**Priority:** 🟡 Medium  
**Estimate:** 1 hour  
**Assignee:** Denys Chumak

#### Content
1. Order Labels → 2. Peel & Stick → 3. Track Anywhere

#### Acceptance Criteria
- [ ] **3-step visual** created
- [ ] **Responsive** design

---

### E3-T4: Features Section

**Type:** Development  
**Epic:** E3 - Landing Page  
**Priority:** 🟡 Medium  
**Estimate:** 1 hour  
**Assignee:** Denys Chumak

#### Features
60-day battery, 180+ countries, offline storage, real-time tracking, shareable links, notifications

#### Acceptance Criteria
- [ ] **6 feature cards** displayed

---

### E3-T5: Pricing Section

**Type:** Development  
**Epic:** E3 - Landing Page  
**Priority:** 🟡 Medium  
**Estimate:** 1 hour  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **3 pricing tiers** displayed
- [ ] **Buy buttons** link to checkout

---

### E4-T1: Dashboard Layout

**Type:** Development  
**Epic:** E4 - Customer Portal  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Create authenticated dashboard with sidebar navigation.

#### Acceptance Criteria
- [ ] **Sidebar** with nav links
- [ ] **Header** with user menu
- [ ] **Responsive** layout

---

### E4-T2: Shipments Overview

**Type:** Development  
**Epic:** E4 - Customer Portal  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Main dashboard with shipment summary cards.

#### Acceptance Criteria
- [ ] **Stats cards** showing counts
- [ ] **Recent shipments** list
- [ ] **Empty state** handled

---

### E4-T3: Shipments List

**Type:** Development  
**Epic:** E4 - Customer Portal  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Full shipments table with filtering and search.

#### Acceptance Criteria
- [ ] **Table** with TanStack Table
- [ ] **Status filter** working
- [ ] **Search** working
- [ ] **Pagination** working

---

### E5-T1: Device Report API

**Type:** Development  
**Epic:** E5 - Tracking Features  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Endpoint
`POST /api/v1/device/report`

#### Acceptance Criteria
- [ ] **Endpoint created**
- [ ] **Device authentication** working
- [ ] **Data validation** rejecting bad data
- [ ] **Locations stored** in database

---

### E5-T2: Location Storage with PostGIS

**Type:** Development  
**Epic:** E5 - Tracking Features  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **Locations stored** correctly
- [ ] **PostGIS** working
- [ ] **Indexes** for performance

---

### E6-T1: Stripe Setup

**Type:** Development  
**Epic:** E6 - Payment  
**Priority:** 🟡 Medium  
**Estimate:** 1 hour  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **Stripe account** configured
- [ ] **Products created** (Single, 5-Pack, 10-Pack)
- [ ] **Test mode** working

---

### P6-T8: Weekly Syncs (Sprint 4)

**Type:** Meeting  
**Epic:** P6 - Product Management  
**Priority:** 🟡 Medium  
**Estimate:** 4 hours (2 meetings)  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **2 meetings** completed
- [ ] **Research findings** shared
- [ ] **Demos delivered**

---

## SPRINT 4 SUMMARY

| Task ID | Task Name | Hours | Category |
|---------|-----------|-------|----------|
| P3-T1 | Consignee Interviews (finish) | 5 | Research |
| P3-T2 | Forwarder Interviews (finish) | 4 | Research |
| P3-T3 | Shipper Interviews | 5 | Research |
| P5-T1 | Research Transcription Review | 4 | Analysis |
| P5-T2 | Affinity Mapping | 4 | Analysis |
| P4-T5 | Grant Project Plan | 4 | Grant |
| P4-T6 | Grant Budget Justification | 3 | Grant |
| P4-T7 | Grant Review & Iteration | 4 | Grant |
| P4-T8 | Grant Final Submission | 2 | Grant |
| E3-T3 | How It Works Section | 1 | Dev |
| E3-T4 | Features Section | 1 | Dev |
| E3-T5 | Pricing Section | 1 | Dev |
| E4-T1 | Dashboard Layout | 2 | Dev |
| E4-T2 | Shipments Overview | 2 | Dev |
| E4-T3 | Shipments List | 2 | Dev |
| E5-T1 | Device Report API | 2 | Dev |
| E5-T2 | Location Storage (PostGIS) | 2 | Dev |
| E6-T1 | Stripe Setup | 1 | Dev |
| P6-T8 | Weekly Syncs (x2) | 4 | PM |
| P6-T9 | Spec Updates | 2 | PM |
| | **TOTAL** | **55** | |
| | **Buffer** | **15** | |

**Sprint 4 Success Criteria:**
1. ✅ All 15-20 user interviews completed
2. ✅ Affinity mapping done with themes
3. ✅ Grant application submitted
4. ✅ Landing page complete and live
5. ✅ Customer portal dashboard working
6. ✅ Device API receiving location data
7. ✅ Stripe configured

---

## SPRINT 5: DETAILED TASK SPECIFICATIONS

**Sprint:** 5 of 6  
**Dates:** March 15-28, 2026 (10 working days)  
**Capacity:** 52 hours  
**Sprint Goal:** Complete research analysis; build admin panel; implement notifications and payment; begin QA.

---

### P5-T3: Research Report Writing

**Type:** Documentation  
**Epic:** P5 - User Research Analysis  
**Priority:** 🔴 High  
**Estimate:** 6 hours  
**Assignee:** Denys Chumak

#### Summary
Write the comprehensive user research report synthesizing all interview findings.

#### User Story
**As the** product team and stakeholders,  
**I need** a clear research report with findings and recommendations,  
**So that** we can make data-driven product decisions.

#### Report Structure

```
📄 HyperLabel User Research Report
├── Executive Summary (1 page)
│   ├── Key findings (3-5 bullets)
│   ├── Main recommendations
│   └── Next steps
│
├── Methodology (0.5 page)
│   ├── Interview approach
│   ├── Participant criteria
│   └── Analysis method
│
├── Participant Overview (1 page)
│   ├── Demographics table
│   ├── Company profiles
│   └── Interview schedule
│
├── Findings by Theme (4-6 pages)
│   ├── Theme 1: [Problem Severity]
│   │   ├── Key insight
│   │   ├── Supporting quotes (3-5)
│   │   └── Implications
│   ├── Theme 2: [Current Solutions]
│   ├── Theme 3: [Feature Priorities]
│   ├── Theme 4: [Pricing Sensitivity]
│   └── Theme 5: [Workflow Integration]
│
├── Persona Validation (1 page)
│   ├── Consignee persona confirmed/adjusted
│   ├── Forwarder persona confirmed/adjusted
│   └── Key differences from assumptions
│
├── Recommendations (1 page)
│   ├── Product recommendations
│   ├── Pricing recommendations
│   └── Go-to-market recommendations
│
└── Appendix
    ├── Interview guide
    ├── Full affinity map
    └── Raw quote database
```

#### Acceptance Criteria
- [ ] **Report drafted** (10-12 pages)
- [ ] **All themes covered** with supporting quotes
- [ ] **Clear recommendations** actionable by team
- [ ] **Reviewed by Andrii**
- [ ] **PDF exported** for sharing

---

### P5-T4: Persona Refinement

**Type:** Analysis  
**Epic:** P5 - User Research Analysis  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Update persona definitions based on research findings.

#### Deliverables
- Updated Consignee persona
- Updated Forwarder/Shipper persona
- Differences from original assumptions documented

#### Acceptance Criteria
- [ ] **Personas updated** in SPEC.md
- [ ] **Evidence-based** changes documented

---

### P5-T5: Feature Prioritization Matrix

**Type:** Analysis  
**Epic:** P5 - User Research Analysis  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Create prioritized feature list based on user feedback.

#### Framework
| Feature | User Value | Effort | Priority |
|---------|-----------|--------|----------|
| Real-time map | High | Medium | P1 |
| Shareable links | High | Low | P1 |
| Email notifications | Medium | Low | P1 |
| ... | ... | ... | ... |

#### Acceptance Criteria
- [ ] **All requested features** listed
- [ ] **Prioritized by value/effort**
- [ ] **MVP scope validated**

---

### E4-T4: Shipment Detail Page

**Type:** Development  
**Epic:** E4 - Customer Portal  
**Priority:** 🔴 High  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Summary
Build the detailed view for a single shipment with map and timeline.

#### User Story
**As a** user tracking a shipment,  
**I want to** see detailed information and location history,  
**So that** I know exactly where my cargo is and has been.

#### Components

**1. Header Section**
- Shipment name/ID
- Current status badge
- Last update time
- Quick actions (share, edit, delete)

**2. Map Section**
- Full-width interactive map
- Current location marker (large)
- Route path (polyline)
- Click markers for details

**3. Info Cards**
- Origin address
- Destination address
- Label ID / Battery %
- Cargo photo (if uploaded)

**4. Location Timeline**
- Chronological list of updates
- Time + location for each
- Expandable for details

#### Implementation

```tsx
// /app/dashboard/shipments/[id]/page.tsx

export default async function ShipmentDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const shipment = await getShipment(params.id)
  const locations = await getShipmentLocations(params.id)
  
  return (
    <div className="space-y-6">
      <ShipmentHeader shipment={shipment} />
      <ShipmentMap locations={locations} />
      <div className="grid md:grid-cols-2 gap-6">
        <ShipmentInfo shipment={shipment} />
        <LocationTimeline locations={locations} />
      </div>
    </div>
  )
}
```

#### Acceptance Criteria
- [ ] **Map displays** current + history
- [ ] **Info cards** showing all details
- [ ] **Timeline** with location history
- [ ] **Share button** generates link
- [ ] **Responsive** on mobile

---

### E4-T5: Create Shipment Flow

**Type:** Development  
**Epic:** E4 - Customer Portal  
**Priority:** 🔴 High  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Summary
Build the multi-step flow to create/link a new shipment.

#### User Story
**As a** user with a HyperLabel,  
**I want to** easily create a shipment and link my label,  
**So that** I can start tracking my cargo.

#### Flow Steps

```
Step 1: Scan or Enter Label ID
├── QR scanner (mobile)
├── Manual entry field
└── Validate label exists & unassigned

Step 2: Shipment Details
├── Name (required)
├── Description (optional)
├── Origin address (optional)
├── Destination address (optional)

Step 3: Cargo Photo (Optional)
├── Camera capture
├── File upload
└── Preview & crop

Step 4: Confirm & Activate
├── Review all details
├── Confirm button
└── Success → redirect to shipment
```

#### Acceptance Criteria
- [ ] **QR scanner** works on mobile
- [ ] **Manual entry** validates label
- [ ] **Address fields** with autocomplete
- [ ] **Photo upload** working
- [ ] **Creates shipment** in database
- [ ] **Activates label** status change

---

### E5-T3: Tracking Map Component

**Type:** Development  
**Epic:** E5 - Tracking Features  
**Priority:** 🔴 High  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Summary
Build the interactive map component using Google Maps.

#### User Story
**As a** user viewing a shipment,  
**I want to** see the location on an interactive map,  
**So that** I can visually understand where my cargo is.

#### Implementation

```tsx
// /components/tracking/tracking-map.tsx
'use client'

import { GoogleMap, Marker, Polyline, useLoadScript } from '@react-google-maps/api'
import { Location } from '@prisma/client'

interface TrackingMapProps {
  locations: Location[]
  className?: string
}

export function TrackingMap({ locations, className }: TrackingMapProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  })

  if (!isLoaded) return <MapSkeleton />
  
  const currentLocation = locations[0]
  const path = locations.map(loc => ({ 
    lat: loc.latitude, 
    lng: loc.longitude 
  }))

  return (
    <GoogleMap
      mapContainerClassName={className}
      center={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
      zoom={12}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: darkMapStyles, // Custom dark theme
      }}
    >
      {/* Current location - large marker */}
      <Marker
        position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
        icon={{
          url: '/markers/current.svg',
          scaledSize: new google.maps.Size(40, 40),
        }}
      />
      
      {/* Route path */}
      <Polyline
        path={path}
        options={{
          strokeColor: '#c4f534',
          strokeWeight: 3,
          strokeOpacity: 0.8,
        }}
      />
      
      {/* History markers - smaller */}
      {locations.slice(1).map((loc, i) => (
        <Marker
          key={loc.id}
          position={{ lat: loc.latitude, lng: loc.longitude }}
          icon={{
            url: '/markers/history.svg',
            scaledSize: new google.maps.Size(12, 12),
          }}
        />
      ))}
    </GoogleMap>
  )
}
```

#### Acceptance Criteria
- [ ] **Map renders** with Google Maps
- [ ] **Current location** prominent marker
- [ ] **Route path** visible
- [ ] **Dark theme** consistent with brand
- [ ] **Mobile responsive**
- [ ] **Loading state** handled

---

### E5-T4: Public Tracking Page

**Type:** Development  
**Epic:** E5 - Tracking Features  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Build the public tracking page accessible via shareable link.

#### User Story
**As a** recipient of a tracking link,  
**I want to** view shipment location without logging in,  
**So that** I can track my incoming cargo easily.

#### URL Structure
`/track/[trackingCode]` → e.g., `/track/HL-ABC123`

#### Page Content
- Shipment name (if provided)
- Current status
- Map with location
- Last updated time
- NO editing, NO sensitive info

#### Implementation

```tsx
// /app/track/[code]/page.tsx

export default async function PublicTrackingPage({ 
  params 
}: { 
  params: { code: string } 
}) {
  const shipment = await getShipmentByTrackingCode(params.code)
  
  if (!shipment) {
    return <NotFoundState />
  }
  
  if (!shipment.shareEnabled) {
    return <SharingDisabledState />
  }
  
  if (shipment.shareExpiresAt && shipment.shareExpiresAt < new Date()) {
    return <LinkExpiredState />
  }
  
  const locations = await getShipmentLocations(shipment.id)
  
  return (
    <div className="min-h-screen bg-slate-950">
      <PublicTrackingHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">
          {shipment.name || 'Shipment Tracking'}
        </h1>
        <StatusBadge status={shipment.status} />
        <TrackingMap locations={locations} className="h-[400px] mt-6" />
        <p className="text-slate-400 mt-4">
          Last updated: {formatRelativeTime(locations[0]?.receivedAt)}
        </p>
      </main>
    </div>
  )
}
```

#### Acceptance Criteria
- [ ] **Public access** without auth
- [ ] **Map displays** current location
- [ ] **Invalid codes** show 404
- [ ] **Disabled sharing** handled
- [ ] **Expired links** handled
- [ ] **No sensitive data** exposed

---

### E6-T2: Checkout Session API

**Type:** Development  
**Epic:** E6 - Payment  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Create API endpoint to initiate Stripe checkout session.

#### Endpoint
`POST /api/checkout`

#### Implementation

```typescript
// /app/api/checkout/route.ts

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRODUCTS = {
  single: { priceId: 'price_xxx', quantity: 1 },
  '5pack': { priceId: 'price_yyy', quantity: 5 },
  '10pack': { priceId: 'price_zzz', quantity: 10 },
}

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { productId } = await req.json()
  
  if (!PRODUCTS[productId]) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price: PRODUCTS[productId].priceId,
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?cancelled=true`,
    customer_email: user?.email,
    metadata: {
      userId: user?.id,
      productId,
      labelQuantity: PRODUCTS[productId].quantity,
    },
  })

  // Create pending order
  await prisma.order.create({
    data: {
      userId: user!.id,
      stripeSessionId: session.id,
      status: 'PENDING',
      amount: session.amount_total!,
      currency: session.currency!,
      quantity: PRODUCTS[productId].quantity,
    }
  })

  return NextResponse.json({ url: session.url })
}
```

#### Acceptance Criteria
- [ ] **Creates Stripe session**
- [ ] **Creates pending order** in DB
- [ ] **Returns checkout URL**
- [ ] **Handles errors** gracefully

---

### E6-T3: Stripe Webhook Handler

**Type:** Development  
**Epic:** E6 - Payment  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Handle Stripe webhooks for payment completion.

#### Events to Handle
- `checkout.session.completed` → Mark order paid, assign labels
- `payment_intent.payment_failed` → Update order status

#### Acceptance Criteria
- [ ] **Webhook endpoint** created
- [ ] **Signature verification** working
- [ ] **Order status updated** on success
- [ ] **Labels assigned** to order

---

### E7-T1: Admin Dashboard Layout

**Type:** Development  
**Epic:** E7 - Admin Panel  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Create the admin dashboard layout with navigation.

#### Admin Routes
```
/admin
├── /dashboard    - Overview stats
├── /labels       - Label inventory
├── /orders       - Order management
├── /users        - User list
└── /shipments    - All shipments
```

#### Acceptance Criteria
- [ ] **Admin layout** created
- [ ] **Navigation** working
- [ ] **Role check** (ADMIN only)
- [ ] **Stats overview** page

---

### E7-T2: Label Inventory Management

**Type:** Development  
**Epic:** E7 - Admin Panel  
**Priority:** 🟡 Medium  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Summary
Build admin interface to manage label inventory.

#### Features
- List all labels with status
- Filter by status (Inventory, Assigned, Active, etc.)
- Add new labels (import from device shipment)
- View label details

#### Acceptance Criteria
- [ ] **Label list** with filtering
- [ ] **Add labels** functionality
- [ ] **Status visible** for each label

---

### E7-T3: Order Management

**Type:** Development  
**Epic:** E7 - Admin Panel  
**Priority:** 🟡 Medium  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Summary
Build admin interface to view and manage orders.

#### Features
- List all orders
- Filter by status
- View order details
- Update shipping tracking
- Process refunds (link to Stripe)

#### Acceptance Criteria
- [ ] **Order list** displayed
- [ ] **Status filtering** working
- [ ] **Can update** shipping info

---

### E8-T1: Email Service Setup (Resend)

**Type:** Development  
**Epic:** E8 - Notifications  
**Priority:** 🟡 Medium  
**Estimate:** 1 hour  
**Assignee:** Denys Chumak

#### Summary
Set up Resend for transactional emails.

#### Implementation

```typescript
// /lib/email.ts

import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}) {
  return resend.emails.send({
    from: 'HyperLabel <notifications@hyperlabel.com>',
    to,
    subject,
    react,
  })
}
```

#### Acceptance Criteria
- [ ] **Resend configured**
- [ ] **Helper function** created
- [ ] **Test email** sends successfully

---

### E8-T2: Email Templates (React Email)

**Type:** Development  
**Epic:** E8 - Notifications  
**Priority:** 🟡 Medium  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Summary
Create email templates for all notification types.

#### Templates
1. **Welcome Email** - After signup
2. **Order Confirmation** - After purchase
3. **Shipment Activated** - Label activated
4. **Low Battery Alert** - Battery < 20%
5. **Delivered Notification** - Arrived at destination

#### Implementation

```tsx
// /emails/shipment-activated.tsx

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface ShipmentActivatedEmailProps {
  shipmentName: string
  trackingUrl: string
}

export function ShipmentActivatedEmail({
  shipmentName,
  trackingUrl,
}: ShipmentActivatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your HyperLabel is now tracking {shipmentName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Shipment Activated!</Heading>
          <Text style={text}>
            Your label for "{shipmentName}" is now active and transmitting location data.
          </Text>
          <Link href={trackingUrl} style={button}>
            Track Your Shipment
          </Link>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#0f172a', padding: '40px 0' }
const container = { /* styles */ }
const h1 = { color: '#ffffff', /* more styles */ }
const text = { color: '#94a3b8' }
const button = { backgroundColor: '#c4f534', color: '#0f172a', /* more */ }
```

#### Acceptance Criteria
- [ ] **5 templates** created
- [ ] **Consistent branding**
- [ ] **Preview in browser** working
- [ ] **Mobile responsive**

---

### E8-T3: Notification Triggers

**Type:** Development  
**Epic:** E8 - Notifications  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Implement triggers to send notifications at appropriate times.

#### Trigger Points
1. **User signup** → Welcome email
2. **Order paid** → Order confirmation
3. **Label activated** → Shipment activated email
4. **Battery < 20%** → Low battery alert
5. **Status = DELIVERED** → Delivered notification

#### Acceptance Criteria
- [ ] **Triggers implemented** for each event
- [ ] **Notifications logged** in database
- [ ] **No duplicate sends**

---

### E9-T1: Unit Tests Setup

**Type:** Development  
**Epic:** E9 - Testing & QA  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Set up Vitest for unit testing.

#### Setup
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

#### Tests to Write
- Utility functions (data cleaning, formatting)
- API route handlers (mocked DB)
- Key business logic

#### Acceptance Criteria
- [ ] **Vitest configured**
- [ ] **10+ unit tests** passing
- [ ] **Coverage report** available

---

### E9-T2: Integration Tests

**Type:** Development  
**Epic:** E9 - Testing & QA  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Write integration tests for critical flows.

#### Critical Flows
1. User signup → DB record created
2. Create shipment → Label assigned
3. Device report → Location stored
4. Checkout → Order created

#### Acceptance Criteria
- [ ] **4 integration tests** passing
- [ ] **Database cleanup** between tests

---

### P6-T10: Weekly Syncs (Sprint 5)

**Type:** Meeting  
**Epic:** P6 - Product Management  
**Priority:** 🟡 Medium  
**Estimate:** 4 hours (2 meetings)  
**Assignee:** Denys Chumak

#### Acceptance Criteria
- [ ] **2 meetings** completed
- [ ] **Research report** presented
- [ ] **Feature demos** delivered

---

## SPRINT 5 SUMMARY

| Task ID | Task Name | Hours | Category |
|---------|-----------|-------|----------|
| P5-T3 | Research Report Writing | 6 | Analysis |
| P5-T4 | Persona Refinement | 2 | Analysis |
| P5-T5 | Feature Prioritization | 2 | Analysis |
| E4-T4 | Shipment Detail Page | 3 | Dev |
| E4-T5 | Create Shipment Flow | 3 | Dev |
| E5-T3 | Tracking Map Component | 3 | Dev |
| E5-T4 | Public Tracking Page | 2 | Dev |
| E6-T2 | Checkout Session API | 2 | Dev |
| E6-T3 | Stripe Webhook Handler | 2 | Dev |
| E7-T1 | Admin Dashboard Layout | 2 | Dev |
| E7-T2 | Label Inventory Management | 3 | Dev |
| E7-T3 | Order Management | 3 | Dev |
| E8-T1 | Email Service Setup | 1 | Dev |
| E8-T2 | Email Templates | 3 | Dev |
| E8-T3 | Notification Triggers | 2 | Dev |
| E9-T1 | Unit Tests Setup | 2 | Dev |
| E9-T2 | Integration Tests | 2 | Dev |
| P6-T10 | Weekly Syncs (x2) | 4 | PM |
| P6-T11 | Spec Updates | 2 | PM |
| | **TOTAL** | **49** | |
| | **Buffer** | **3** | |

**Sprint 5 Success Criteria:**
1. ✅ Research report complete and shared
2. ✅ Personas updated based on research
3. ✅ Customer portal fully functional (create, view, track)
4. ✅ Public tracking pages working
5. ✅ Payment flow complete (checkout → webhook → order)
6. ✅ Admin panel managing labels and orders
7. ✅ Email notifications sending
8. ✅ Core tests passing

---

## SPRINT 6: DETAILED TASK SPECIFICATIONS (FINAL)

**Sprint:** 6 of 6  
**Dates:** March 29-31, 2026 (3 working days)  
**Capacity:** 14 hours  
**Sprint Goal:** Final QA, production deployment, MVP LAUNCH! 🚀

---

### E9-T3: End-to-End Testing

**Type:** Development  
**Epic:** E9 - Testing & QA  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Manual end-to-end testing of complete user flows.

#### Test Scenarios

**1. New User Journey**
- [ ] Visit landing page
- [ ] Sign up (email + Google)
- [ ] View dashboard (empty state)
- [ ] Buy labels (test checkout)
- [ ] Receive confirmation email

**2. Tracking Flow**
- [ ] Create shipment
- [ ] Link label (scan/manual)
- [ ] Upload cargo photo
- [ ] View on map
- [ ] Receive location updates

**3. Sharing Flow**
- [ ] Generate share link
- [ ] Open link (incognito)
- [ ] Verify public view works
- [ ] Disable sharing → verify blocked

**4. Admin Flow**
- [ ] Login as admin
- [ ] View all labels
- [ ] View all orders
- [ ] Update order status

#### Acceptance Criteria
- [ ] **All scenarios** passed
- [ ] **Bugs documented** and fixed
- [ ] **Edge cases** handled

---

### E9-T4: Production Environment Setup

**Type:** DevOps  
**Epic:** E9 - Testing & QA  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Configure production environment and verify all services.

#### Checklist

**1. Firebase + Cloud Run Production**
- [ ] Production domain configured (Firebase Hosting)
- [ ] All secrets configured in **GitHub Secrets**
- [ ] Custom domain DNS configured
- [ ] SSL working

**2. Database (Cloud SQL / Neon)**
- [ ] Production database created
- [ ] Connection string configured
- [ ] Migrations applied
- [ ] Backups enabled

**3. External Services**
- [ ] Clerk production keys
- [ ] Stripe live mode keys
- [ ] Resend verified domain
- [ ] Google Maps production key

**4. Monitoring**
- [ ] Error tracking (Sentry) configured
- [ ] Logs accessible
- [ ] Uptime monitoring set

#### Acceptance Criteria
- [ ] **Production deploys** successfully
- [ ] **All integrations** working
- [ ] **Monitoring** active

---

### E9-T5: Production Deploy & Smoke Test

**Type:** DevOps  
**Epic:** E9 - Testing & QA  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Deploy to production and run smoke tests.

#### Deployment Steps
1. Merge to main branch
2. GitHub Actions triggers Firebase/Cloud Run deploy
3. Verify deployment successful
4. Run smoke tests on production URL

#### Smoke Tests
- [ ] Homepage loads
- [ ] Sign up works
- [ ] Sign in works
- [ ] Dashboard loads
- [ ] Map loads
- [ ] API responds

#### Acceptance Criteria
- [ ] **Production live** at hyperlabel.com
- [ ] **All smoke tests** pass
- [ ] **No critical errors** in logs

---

### E9-T6: Documentation Finalization

**Type:** Documentation  
**Epic:** E9 - Testing & QA  
**Priority:** 🟡 Medium  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Finalize all documentation for launch.

#### Documentation to Complete

**1. User Documentation**
- Quick start guide
- FAQ section
- How to activate label
- How to share tracking

**2. Technical Documentation**
- API documentation (already at label.utec.ua/api/docs)
- Webhook integration guide
- Environment setup guide

**3. Internal Documentation**
- Admin panel guide
- Common issues / troubleshooting
- Support playbook

#### Acceptance Criteria
- [ ] **User docs** on website
- [ ] **Tech docs** accessible
- [ ] **Internal docs** in Notion/docs folder

---

### P6-T12: Launch Preparation

**Type:** Product Management  
**Epic:** P6 - Product Management  
**Priority:** 🔴 High  
**Estimate:** 3 hours  
**Assignee:** Denys Chumak

#### Summary
Final preparation for MVP launch.

#### Launch Checklist

**1. Pre-Launch (Day before)**
- [ ] All features tested
- [ ] Production deployed
- [ ] Team briefed
- [ ] Support channels ready (email)

**2. Launch Day**
- [ ] Announcement to early users/waitlist
- [ ] Social media posts (LinkedIn)
- [ ] Monitor for issues
- [ ] Be available for support

**3. Post-Launch (First week)**
- [ ] Monitor usage metrics
- [ ] Collect feedback
- [ ] Fix critical bugs immediately
- [ ] Weekly report to Andrii

#### Acceptance Criteria
- [ ] **Launch checklist** complete
- [ ] **Announcement sent**
- [ ] **Monitoring active**

---

### P6-T13: Final Sync with Andrii

**Type:** Meeting  
**Epic:** P6 - Product Management  
**Priority:** 🔴 High  
**Estimate:** 2 hours  
**Assignee:** Denys Chumak

#### Summary
Final sync before launch to align on go-live.

#### Agenda
1. Demo full platform
2. Review research findings (brief)
3. Confirm launch plan
4. Discuss post-launch priorities
5. Celebrate! 🎉

#### Acceptance Criteria
- [ ] **Demo delivered**
- [ ] **Launch approved**
- [ ] **Post-MVP priorities** agreed

---

## SPRINT 6 SUMMARY (FINAL)

| Task ID | Task Name | Hours | Category |
|---------|-----------|-------|----------|
| E9-T3 | End-to-End Testing | 2 | QA |
| E9-T4 | Production Environment Setup | 2 | DevOps |
| E9-T5 | Production Deploy & Smoke Test | 2 | DevOps |
| E9-T6 | Documentation Finalization | 2 | Docs |
| P6-T12 | Launch Preparation | 3 | PM |
| P6-T13 | Final Sync with Andrii | 2 | PM |
| | **TOTAL** | **13** | |
| | **Buffer** | **1** | |

**Sprint 6 Success Criteria:**
1. ✅ All E2E tests passing
2. ✅ Production environment configured
3. ✅ **MVP DEPLOYED TO PRODUCTION**
4. ✅ Documentation complete
5. ✅ Launch announcement sent
6. ✅ **MVP LAUNCHED! 🚀**

---

## PROJECT COMPLETION SUMMARY

### Total Hours Breakdown

| Sprint | Dates | Hours | Focus |
|--------|-------|-------|-------|
| 1 | Jan 26-31 | 35 | Market Research |
| 2 | Feb 1-14 | 70 | Investor Materials (⚠️ Feb 6) |
| 3 | Feb 15-28 | 70 | User Interviews, Auth, Landing |
| 4 | Mar 1-14 | 70 | Interviews Done, Grant Submit, Portal |
| 5 | Mar 15-28 | 52 | Research Report, Admin, Notifications, Testing |
| 6 | Mar 29-31 | 14 | QA, Deploy, **LAUNCH** |
| **TOTAL** | | **311** | |
| **Buffer** | | **18** | Contingency |
| **GRAND TOTAL** | | **329** | |

### Key Milestones

| Date | Milestone |
|------|-----------|
| **Feb 6** | ⚠️ Investor materials delivered |
| **Feb 28** | Auth + Landing page live |
| **Mar 14** | Grant submitted + Portal working |
| **Mar 28** | Full platform tested |
| **Mar 31** | 🚀 **MVP LAUNCH** |

### Deliverables at Launch

**Product:**
- ✅ Landing page (live)
- ✅ Customer portal (auth, shipments, tracking)
- ✅ Interactive map tracking
- ✅ Shareable tracking links
- ✅ Payment processing
- ✅ Email notifications
- ✅ Admin panel

**Research & Business:**
- ✅ User research report (15-20 interviews)
- ✅ Validated personas
- ✅ Investor materials (Teaser, Financial Model, Business Plan)
- ✅ Grant application submitted

---

##### Weeks 4-5: Feb 15-28 (10 working days) — 70 hours

| Epic | Focus | Hours |
|------|-------|-------|
| **P3** | Conduct User Interviews | 30 |
| **P4** | Grant Application (continue) | 10 |
| **P6** | Product Management | 8 |
| **E1** | Project Setup (finish) | 2 |
| **E2** | Authentication & Users | 12 |
| **E3** | Landing Page | 8 |
| | **Weeks 4-5 Total** | **70** |

**Deliverables:**
- [ ] ~10 user interviews conducted
- [ ] Grant application in progress
- [ ] Auth system working
- [ ] Landing page draft

---

##### Weeks 6-7: Mar 1-14 (10 working days) — 70 hours

| Epic | Focus | Hours |
|------|-------|-------|
| **P3** | User Interviews (finish) | 10 |
| **P5** | Research Analysis | 10 |
| **P4** | Grant Application (finish) | 10 |
| **P6** | Product Management | 8 |
| **E3** | Landing Page (finish) | 2 |
| **E4** | Customer Portal | 14 |
| **E5** | Tracking Features | 10 |
| **E6** | Payment (start) | 6 |
| | **Weeks 6-7 Total** | **70** |

**Deliverables:**
- [ ] All 15-20 interviews complete
- [ ] Grant application submitted
- [ ] Landing page live
- [ ] Customer portal working
- [ ] Tracking map functional

---

##### Weeks 8-9: Mar 15-28 (10 working days) — 70 hours

| Epic | Focus | Hours |
|------|-------|-------|
| **P5** | Research Analysis (finish) | 10 |
| **P6** | Product Management | 10 |
| **E5** | Tracking Features (finish) | 4 |
| **E6** | Payment (finish) | 4 |
| **E7** | Admin Panel | 10 |
| **E8** | Notifications | 8 |
| **E9** | Testing & QA | 6 |
| | **Weeks 8-9 Total** | **52** |

**Deliverables:**
- [ ] Research report complete
- [ ] Admin panel working
- [ ] Notifications sending
- [ ] Payment processing live

---

##### Week 10: Mar 29-31 (3 working days) — 14 hours

| Epic | Focus | Hours |
|------|-------|-------|
| **P6** | Product Management (final) | 6 |
| **E9** | Testing, QA & Launch | 4 |
| **E9** | Production Deploy | 4 |
| | **Week 10 Total** | **14** |

**Deliverables:**
- [ ] Full platform tested
- [ ] Production deployment
- [ ] Documentation complete
- [ ] MVP LAUNCHED ✅

---

#### SUMMARY: Hours by Period

| Period | Dates | Working Days | Hours | Cumulative |
|--------|-------|--------------|-------|------------|
| Week 1 | Jan 26-31 | 5 | 35 | 35 |
| Weeks 2-3 | Feb 1-14 | 10 | 70 | 105 |
| Weeks 4-5 | Feb 15-28 | 10 | 70 | 175 |
| Weeks 6-7 | Mar 1-14 | 10 | 70 | 245 |
| Weeks 8-9 | Mar 15-28 | 10 | 52 | 297 |
| Week 10 | Mar 29-31 | 3 | 14 | 311 |
| Buffer | — | — | 18 | **329** |

**Average:** ~7 hours/working day (47 working days total)

---

#### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + shadcn/ui | UI components |
| **Database** | Cloud SQL (PostgreSQL 15) + PostGIS | Data + geospatial |
| **ORM** | Prisma | Database access |
| **Auth** | Clerk | Authentication |
| **Payments** | Stripe | Checkout, subscriptions |
| **Email** | Resend + React Email | Transactional emails |
| **Maps** | Google Maps API | Tracking visualization |
| **Geocoding** | LocationIQ (primary) + Google (fallback) | Address lookup |
| **Hosting** | Firebase Hosting + Cloud Run | Frontend + API |
| **Storage** | Google Cloud Storage | File uploads, exports |
| **CI/CD** | GitHub Actions | Automated testing/deploy |
| **Monitoring** | Google Cloud Monitoring | Alerts, dashboards |
| **Logging** | Google Cloud Logging | Centralized logs |
| **Analytics** | PostHog | Product analytics |

---

#### Task Tracking Structure (Linear)

**Hierarchy:**
```
Project: HyperLabel MVP
├── Cycle: Month 1 (Jan 2026)
│   ├── Epic: E1 - Project Setup & Infrastructure
│   │   ├── Task: E1-T1 - Initialize monorepo
│   │   ├── Task: E1-T2 - Database setup
│   │   └── ...
│   ├── Epic: E2 - Authentication & User Management
│   └── Epic: E3 - Landing Page
├── Cycle: Month 2 (Feb 2026)
│   ├── Epic: E4 - Customer Portal & Dashboard
│   ├── Epic: E5 - Tracking Features & Device Integration
│   └── Epic: E6 - Payment & Order Processing
└── Cycle: Month 3 (Mar 2026)
    ├── Epic: E7 - Admin Panel
    ├── Epic: E8 - Notifications
    └── Epic: E9 - Testing, QA & Launch
```

**Labels:**
- `type:feature` - New functionality
- `type:bug` - Bug fix
- `type:infra` - Infrastructure/DevOps
- `priority:high` - Must have for MVP
- `priority:medium` - Should have
- `priority:low` - Nice to have

---

### 11.6 Technical Deep-Dive & AI-Ready Prompts

**Purpose:** Detailed task specifications optimized for AI-assisted development (Cursor + Claude/GPT)  
**Architecture:** Modern, scalable, Google Cloud-first where beneficial  
**Approach:** Senior developer standards with production-ready code

---

#### ARCHITECTURE DECISIONS

##### Tech Stack (Final)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR, API routes, Google Cloud compatible |
| **Language** | TypeScript (strict mode) | Type safety, better AI assistance |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, consistent UI |
| **Database** | Cloud SQL (PostgreSQL 15) + PostGIS | Google Cloud native, geospatial support |
| **ORM** | Prisma | Type-safe, great DX |
| **Auth** | Clerk | Fast setup, social login, webhooks |
| **Payments** | Stripe | Industry standard |
| **Email** | Resend + React Email | Modern, developer-friendly templates |
| **Maps** | Google Maps JavaScript API | Best global coverage, your expertise |
| **Geocoding** | LocationIQ (primary) + Google (fallback) | Cost-effective with quality fallback |
| **Hosting** | Firebase Hosting (frontend) + Cloud Run (API) | Google Cloud unified, scalable |
| **Storage** | Google Cloud Storage | Images, exports, unified billing |
| **Logging** | Google Cloud Logging | Centralized, integrated with GCP |
| **Monitoring** | Google Cloud Monitoring | Alerts, dashboards, SLOs |
| **Analytics** | PostHog | Open-source, privacy-friendly, powerful |
| **CI/CD** | GitHub Actions → Firebase/Cloud Run | Auto-deploy on push |

##### Why This Stack

**Google Cloud Products (7):**
- Cloud SQL — Managed PostgreSQL with PostGIS
- Cloud Run — Serverless API hosting
- Firebase Hosting — Fast static/SSR hosting
- Google Maps — Tracking visualization
- Google Geocoding — Fallback for edge cases
- Cloud Storage — File uploads
- Cloud Logging + Monitoring — Observability

**Non-Google (justified):**
- Clerk — Saves 10+ hours vs Firebase Auth, beautiful pre-built UI
- Stripe — Industry standard, no Google alternative
- Resend — Best developer experience for transactional email
- PostHog — Open-source, more features than GA, privacy-friendly
- GitHub Actions — Better integration with GitHub repos

---

##### CI/CD: GitHub Actions + GitHub Secrets

**Pipeline:** GitHub Actions deploys to Firebase Hosting (frontend) and Cloud Run (API)  
**Secrets:** All API keys and credentials stored in **GitHub Secrets**

###### GitHub Secrets Configuration

| Secret Name | Description | Used In |
|-------------|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON | Deploy to Firebase Hosting |
| `GCP_PROJECT_ID` | Google Cloud project ID | Cloud Run, Cloud SQL |
| `GCP_SA_KEY` | GCP service account JSON | Cloud Run deployment |
| `DATABASE_URL` | Cloud SQL connection string | API runtime |
| `CLERK_SECRET_KEY` | Clerk backend API key | API runtime |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | Build time |
| `STRIPE_SECRET_KEY` | Stripe backend API key | API runtime |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | API runtime |
| `RESEND_API_KEY` | Resend email API key | API runtime |
| `GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | Build time |
| `LOCATIONIQ_API_KEY` | LocationIQ geocoding API key | API runtime |
| `POSTHOG_API_KEY` | PostHog analytics key | Build time |

###### GitHub Actions Workflow

**.github/workflows/deploy.yml**
```yaml
name: Deploy to Firebase & Cloud Run

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test

  deploy-frontend:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
          NEXT_PUBLIC_POSTHOG_KEY: ${{ secrets.POSTHOG_API_KEY }}
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.GCP_PROJECT_ID }}

  deploy-api:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: |
          gcloud run deploy hyperlabel-api \
            --source . \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars "DATABASE_URL=${{ secrets.DATABASE_URL }}" \
            --set-env-vars "CLERK_SECRET_KEY=${{ secrets.CLERK_SECRET_KEY }}" \
            --set-env-vars "STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}" \
            --set-env-vars "STRIPE_WEBHOOK_SECRET=${{ secrets.STRIPE_WEBHOOK_SECRET }}" \
            --set-env-vars "RESEND_API_KEY=${{ secrets.RESEND_API_KEY }}" \
            --set-env-vars "LOCATIONIQ_API_KEY=${{ secrets.LOCATIONIQ_API_KEY }}"
```

###### Setup Steps

1. **Create GitHub Secrets:**
   - Go to repo → Settings → Secrets and variables → Actions
   - Add each secret from the table above

2. **Create GCP Service Account:**
   ```bash
   # Create service account
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions Deploy"
   
   # Grant permissions
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/firebase.admin"
   
   # Create and download key
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
   ```

3. **Add key.json contents to GitHub Secrets** as `GCP_SA_KEY` and `FIREBASE_SERVICE_ACCOUNT`

---

##### Geocoding API Comparison

| Provider | Free Tier | Paid Price | Quality | Recommendation |
|----------|-----------|------------|---------|----------------|
| **Google Geocoding** | $200/mo credit | $5/1000 req | ⭐⭐⭐⭐⭐ | Fallback for edge cases |
| **LocationIQ** | 5,000/day FREE | $0.45/1000 | ⭐⭐⭐⭐ | **PRIMARY - Best value** |
| **OpenCage** | 2,500/day FREE | $0.50/1000 | ⭐⭐⭐⭐ | Good alternative |
| **Nominatim (OSM)** | Unlimited (self-host) | Free | ⭐⭐⭐ | Rate limited, less accurate |
| **Mapbox** | 100,000/mo FREE | $0.75/1000 | ⭐⭐⭐⭐ | Good but more expensive |
| **Geoapify** | 3,000/day FREE | $0.40/1000 | ⭐⭐⭐ | Budget option |

**Strategy:** Use LocationIQ for 95% of requests (free tier = 150,000/month), fallback to Google for failed lookups.

```typescript
// Geocoding Strategy
async function reverseGeocode(lat: number, lon: number): Promise<Address> {
  // Try LocationIQ first (free)
  const locationIQ = await tryLocationIQ(lat, lon);
  if (locationIQ.success) return locationIQ.data;
  
  // Fallback to Google (paid but reliable)
  const google = await tryGoogleGeocoding(lat, lon);
  if (google.success) return google.data;
  
  // Return raw coordinates if both fail
  return { raw: `${lat}, ${lon}` };
}
```

---

#### AI-READY TASK PROMPTS

Each task below is written as a prompt you can paste directly into Cursor/Claude.

---

##### EPIC E1: Project Setup & Infrastructure

###### E1-T1: Initialize Next.js Monorepo

```
TASK: Initialize a Next.js 14 project with TypeScript for HyperLabel

REQUIREMENTS:
1. Create Next.js 14 app with App Router (not Pages Router)
2. TypeScript with strict mode enabled
3. Tailwind CSS configured
4. ESLint + Prettier with consistent rules
5. Path aliases (@/ for src/)
6. Environment variables setup (.env.local, .env.example)

FOLDER STRUCTURE:
/src
  /app                 # Next.js App Router
    /api              # API routes
    /(auth)           # Auth pages (sign-in, sign-up)
    /(dashboard)      # Protected dashboard pages
    /(public)         # Public pages (landing, tracking)
  /components         # React components
    /ui               # shadcn/ui components
    /features         # Feature-specific components
  /lib                # Utilities, helpers
    /db               # Database client
    /api              # API helpers
  /types              # TypeScript types
  /hooks              # Custom React hooks

COMMANDS TO RUN:
- pnpm create next-app@latest hyperlabel --typescript --tailwind --eslint --app --src-dir
- Install: @clerk/nextjs, @prisma/client, stripe, resend, zod, react-hook-form

OUTPUT: Complete project structure with all configs
```

###### E1-T2: Database Setup (Cloud SQL + PostGIS)

```
TASK: Set up PostgreSQL database with PostGIS on Google Cloud SQL

REQUIREMENTS:
1. Prisma schema with these models:
   - User (synced from Clerk)
   - Label (physical device)
   - Shipment (cargo being tracked)
   - Location (GPS data points with PostGIS)
   - Order (Stripe purchases)
   - Notification (sent alerts)

2. PostGIS extension for geospatial queries

3. Database indexes for performance:
   - Locations by shipment_id + timestamp
   - Shipments by user_id + status
   - Labels by device_id (unique)

PRISMA SCHEMA REQUIREMENTS:
- Use @db.Uuid for IDs
- Use @db.Timestamptz for timestamps
- Location model needs: latitude, longitude, accuracy, battery_pct, signal_strength
- Support for offline_queue (JSONB array of buffered locations)

ENVIRONMENT:
- DATABASE_URL for Cloud SQL connection
- Use Prisma connection pooling (pgbouncer mode)

OUTPUT: Complete schema.prisma file + migration commands
```

###### E1-T3: Database Schema Design

```
TASK: Design complete Prisma schema for HyperLabel tracking platform

MODELS NEEDED:

1. User
   - id, clerkId, email, name, role (CUSTOMER/ADMIN)
   - createdAt, updatedAt
   - Relations: shipments, orders, labels

2. Label
   - id, deviceId (IMEI), status (INVENTORY/ASSIGNED/ACTIVE/DEPLETED)
   - activatedAt, battery, firmwareVersion
   - Relations: shipment, locations

3. Shipment
   - id, trackingCode (public), name, description
   - status (PENDING/IN_TRANSIT/DELIVERED/CANCELLED)
   - originAddress, destinationAddress (optional)
   - cargoPhotoUrl
   - shareEnabled, shareExpiresAt
   - Relations: user, label, locations

4. Location
   - id, shipmentId, labelId
   - latitude, longitude (PostGIS POINT)
   - accuracy, battery, signalStrength
   - address (reverse geocoded), addressSource (LOCATIONIQ/GOOGLE/RAW)
   - isOfflineData (was buffered)
   - recordedAt (device time), receivedAt (server time)

5. Order
   - id, stripeSessionId, stripePaymentIntentId
   - status (PENDING/PAID/FAILED/REFUNDED)
   - amount, currency, quantity
   - shippingAddress (JSON)
   - Relations: user, labels

6. Notification
   - id, userId, shipmentId
   - type (ACTIVATED/LOW_BATTERY/NO_SIGNAL/DELIVERED/STUCK)
   - channel (EMAIL/WEBHOOK)
   - sentAt, deliveredAt

OUTPUT: Complete schema.prisma with all relations, indexes, enums
```

---

##### EPIC E2: Authentication & User Management

###### E2-T1: Clerk Integration

```
TASK: Integrate Clerk authentication into Next.js 14 App Router

REQUIREMENTS:
1. Install and configure @clerk/nextjs
2. Set up ClerkProvider in layout.tsx
3. Create middleware.ts for route protection:
   - Public routes: /, /track/*, /api/v1/device/*
   - Protected routes: /dashboard/*, /admin/*
   - Admin routes: /admin/* (check role claim)

4. Environment variables:
   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   - CLERK_SECRET_KEY
   - NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   - NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   - NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   - NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

5. Customize Clerk appearance to match brand (dark theme, green accent #c4f534)

OUTPUT: 
- middleware.ts with route protection
- ClerkProvider setup in root layout
- Sign-in/sign-up pages using Clerk components
```

###### E2-T5: Clerk Webhook for User Sync

```
TASK: Create webhook endpoint to sync Clerk users to database

ENDPOINT: POST /api/webhooks/clerk

REQUIREMENTS:
1. Verify webhook signature using Clerk's svix library
2. Handle events:
   - user.created → Create User in DB
   - user.updated → Update User in DB  
   - user.deleted → Soft delete User (set deletedAt)

3. Extract user data:
   - clerkId: event.data.id
   - email: event.data.email_addresses[0].email_address
   - name: event.data.first_name + ' ' + event.data.last_name
   - imageUrl: event.data.image_url

4. Error handling:
   - Return 200 even if DB fails (prevent Clerk retries)
   - Log errors to console/monitoring
   - Idempotent (handle duplicate events)

5. Set up webhook in Clerk Dashboard:
   - URL: https://hyperlabel.com/api/webhooks/clerk
   - Events: user.created, user.updated, user.deleted

OUTPUT: Complete webhook handler with signature verification
```

---

##### EPIC E5: Tracking & Geocoding (Detailed)

###### E5-T1: Device Report API

```
TASK: Create API endpoint for device location reports

ENDPOINT: POST /api/v1/device/report

AUTHENTICATION:
- Header: X-Device-ID (required)
- Header: X-API-Key (required)
- Validate against Label.deviceId in database

REQUEST BODY:
{
  "device_id": "HL-001234",
  "timestamp": "2026-01-15T10:30:00Z",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "accuracy_m": 15,
  "battery_pct": 72,
  "signal_strength": -85,
  "offline_queue": [
    {
      "timestamp": "2026-01-15T08:00:00Z",
      "latitude": 22.3193,
      "longitude": 114.1694,
      "battery_pct": 75
    }
  ]
}

PROCESSING:
1. Validate device exists and is ACTIVE
2. Data cleaning:
   - Reject if lat=0 AND lon=0 (invalid GPS)
   - Reject if lat outside [-90, 90] or lon outside [-180, 180]
   - Reject if battery_pct outside [0, 100]
3. Store current location
4. Process offline_queue (store each with isOfflineData=true)
5. Trigger async geocoding (don't block response)
6. Check for notification triggers:
   - Battery < 20% → LOW_BATTERY notification
   - Battery < 10% → CRITICAL_BATTERY notification
7. Update Label.lastSeenAt, Label.battery

RESPONSE:
- 200: { "status": "ok", "processed": 3 }
- 401: { "error": "Invalid device credentials" }
- 400: { "error": "Invalid location data" }

OUTPUT: Complete API route with validation, storage, and async geocoding
```

###### E5-T2: Reverse Geocoding Service

```
TASK: Create reverse geocoding service with LocationIQ primary, Google fallback

FILE: /src/lib/geocoding.ts

REQUIREMENTS:
1. Primary: LocationIQ API (free tier: 5000/day)
   - Endpoint: https://us1.locationiq.com/v1/reverse
   - Params: lat, lon, format=json, key=API_KEY
   
2. Fallback: Google Geocoding API
   - Endpoint: https://maps.googleapis.com/maps/api/geocode/json
   - Params: latlng={lat},{lng}, key=API_KEY

3. Response normalization:
   interface GeocodedAddress {
     formatted: string;        // "Dubai International Airport, Dubai, UAE"
     city: string | null;      // "Dubai"
     country: string | null;   // "United Arab Emirates"
     countryCode: string;      // "AE"
     source: 'LOCATIONIQ' | 'GOOGLE' | 'RAW';
   }

4. Caching strategy:
   - Cache results in Redis or database for 30 days
   - Round coordinates to 3 decimal places for cache key (111m precision)
   - Cache key: `geocode:${lat.toFixed(3)}:${lon.toFixed(3)}`

5. Rate limiting:
   - Track daily LocationIQ usage
   - Switch to Google if approaching limit
   - Log when fallback is used

6. Error handling:
   - Network timeout: 5 seconds
   - Retry once on failure
   - Return raw coordinates if both fail

ENVIRONMENT VARIABLES:
- LOCATIONIQ_API_KEY
- GOOGLE_GEOCODING_API_KEY

OUTPUT: Complete geocoding module with caching and fallback
```

###### E5-T4: Google Maps Component

```
TASK: Create reusable Google Maps component for tracking visualization

FILE: /src/components/features/tracking/TrackingMap.tsx

REQUIREMENTS:
1. Use @react-google-maps/api library
2. Props interface:
   interface TrackingMapProps {
     locations: Location[];           // Array of location points
     currentLocation?: Location;      // Latest location (highlighted)
     originAddress?: string;          // Origin marker
     destinationAddress?: string;     // Destination marker
     showRoute?: boolean;             // Show polyline path
     height?: string;                 // Map height (default: 400px)
     onMarkerClick?: (location: Location) => void;
   }

3. Features:
   - Auto-fit bounds to show all markers
   - Custom markers: origin (green), destination (red), current (blue pulse)
   - Polyline for route with gradient (older = faded)
   - Info window on marker click showing timestamp + address
   - Dark theme map styling (match app theme)
   
4. Performance:
   - Only render markers for last 100 locations on map
   - Use marker clustering if > 50 points
   - Lazy load Google Maps script

5. Loading state:
   - Skeleton while loading
   - Error boundary if Maps fails to load

GOOGLE MAPS STYLING (Dark theme):
[
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] }
]

OUTPUT: Complete map component with all features
```

---

##### EPIC E6: Payments (Stripe)

###### E6-T3: Stripe Checkout Flow

```
TASK: Implement Stripe Checkout for label purchases

FLOW:
1. User clicks "Buy" on pricing page
2. Create Stripe Checkout Session (server-side)
3. Redirect to Stripe hosted checkout
4. Handle success/cancel redirects
5. Webhook processes payment → creates Order

ENDPOINT: POST /api/checkout/create-session

REQUEST:
{
  "quantity": 5,           // Number of labels
  "priceId": "price_xxx"   // Stripe Price ID
}

CHECKOUT SESSION CONFIG:
{
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [{
    price: priceId,
    quantity: quantity,
  }],
  success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/checkout/cancel`,
  customer_email: user.email,  // Pre-fill if logged in
  metadata: {
    userId: user.id,
    quantity: quantity.toString(),
  },
  shipping_address_collection: {
    allowed_countries: ['US', 'GB', 'DE', 'FR', 'NL', 'BE', 'CA', 'AU'],
  },
  shipping_options: [
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 0, currency: 'usd' },
        display_name: 'Free international shipping',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 5 },
          maximum: { unit: 'business_day', value: 10 },
        },
      },
    },
  ],
}

STRIPE PRODUCTS TO CREATE:
1. Single Label - $25 (price_single)
2. 5-Pack - $110 ($22 each) (price_5pack)
3. 10-Pack - $200 ($20 each) (price_10pack)

OUTPUT: 
- Create checkout session API route
- Success page that shows order confirmation
- Cancel page with retry option
```

###### E6-T5: Stripe Webhook Handler

```
TASK: Handle Stripe webhooks for payment processing

ENDPOINT: POST /api/webhooks/stripe

EVENTS TO HANDLE:
1. checkout.session.completed
   - Create Order in database
   - Assign labels from inventory to order
   - Send confirmation email via Resend
   - Update inventory count

2. payment_intent.payment_failed
   - Log failure
   - Send failure notification (optional)

3. charge.refunded
   - Update Order status to REFUNDED
   - Return labels to inventory (if not shipped)

WEBHOOK VERIFICATION:
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body, sig, process.env.STRIPE_WEBHOOK_SECRET
);

ORDER CREATION LOGIC:
1. Parse session metadata (userId, quantity)
2. Get shipping address from session
3. Create Order record:
   - stripeSessionId
   - amount (from session)
   - quantity
   - shippingAddress (JSON)
   - status: PAID
4. Find available labels (status: INVENTORY)
5. Assign labels to order (update Label.orderId)
6. Update labels status: ASSIGNED
7. Send confirmation email with:
   - Order number
   - Quantity
   - Shipping address
   - Expected delivery (5-10 business days)

OUTPUT: Complete webhook handler with all event processing
```

---

#### BUSINESS & LEGAL SETUP CHECKLIST

##### Company Formation

| Task | Priority | Notes |
|------|----------|-------|
| **UK Ltd Company** | 🔴 HIGH | Register via Companies House or use Stripe Atlas |
| **Registered Address** | 🔴 HIGH | Virtual office or accountant address |
| **Business Bank Account** | 🔴 HIGH | Tide, Revolut Business, or Starling |
| **Stripe Account** | 🔴 HIGH | Connect to UK company |
| **Domain Registration** | 🔴 HIGH | hyperlabel.com (check availability) |
| **Trademark Search** | 🟡 MEDIUM | UK/EU/US trademark for "HyperLabel" |
| **Director's Insurance** | 🟡 MEDIUM | D&O insurance |
| **Accountant** | 🟡 MEDIUM | Xero + accountant for VAT, tax |

##### Legal Documents Needed

| Document | Priority | How to Create |
|----------|----------|---------------|
| **Privacy Policy** | 🔴 HIGH | Template + customize for location tracking |
| **Terms of Service** | 🔴 HIGH | Template + customize for SaaS + hardware |
| **Cookie Policy** | 🔴 HIGH | Required for EU visitors |
| **Refund Policy** | 🔴 HIGH | Already defined in spec |
| **GDPR Data Processing** | 🔴 HIGH | Required for EU customers |
| **Shipping Policy** | 🟡 MEDIUM | Delivery times, responsibilities |
| **Acceptable Use Policy** | 🟡 MEDIUM | What users can/cannot track |

##### Financial Setup

| Task | Priority | Notes |
|------|----------|-------|
| **Xero/QuickBooks** | 🔴 HIGH | Accounting software |
| **Stripe fees calculation** | 🔴 HIGH | 2.9% + 30¢ per transaction |
| **VAT Registration** | 🟡 MEDIUM | Required if UK revenue > £85k |
| **EORI Number** | 🟡 MEDIUM | For customs (importing labels from China) |
| **Unit Economics Model** | 🔴 HIGH | Part of investor materials |

##### Cost Projections (Monthly)

| Service | Free Tier | Est. MVP Cost | Scale Cost |
|---------|-----------|---------------|------------|
| Firebase Hosting | 10GB storage, 360MB/day | $0 | $25/mo |
| Cloud Run | 2M requests/mo | $0 | $20/mo |
| Cloud SQL | - | $30/mo | $100/mo |
| Clerk | 10k MAU | $0 | $25/mo |
| Stripe | - | 2.9% + 30¢/txn | Same |
| Resend | 3k emails | $0 | $20/mo |
| LocationIQ | 5k/day | $0 | $50/mo |
| Google Maps | $200 credit | $0 | $50/mo |
| Domain | - | $15/yr | Same |
| **Total** | | **~$30/mo** | **~$265/mo** |

---

#### PRODUCTION READINESS CHECKLIST

##### Before Launch

- [ ] **Security**
  - [ ] All API routes validate input (Zod)
  - [ ] Rate limiting on public APIs (device/report)
  - [ ] CORS configured correctly
  - [ ] Environment variables not exposed
  - [ ] SQL injection prevention (Prisma handles)
  - [ ] XSS prevention (React handles)

- [ ] **Performance**
  - [ ] Database indexes created
  - [ ] Images optimized (next/image)
  - [ ] API responses cached where appropriate
  - [ ] Lazy loading for heavy components

- [ ] **Monitoring**
  - [ ] Error tracking (Cloud Error Reporting)
  - [ ] Uptime monitoring (Cloud Monitoring)
  - [ ] Database connection monitoring (Cloud SQL Insights)
  - [ ] API latency tracking

- [ ] **Data**
  - [ ] Database backup configured
  - [ ] Data export functionality (GDPR)
  - [ ] User deletion workflow (GDPR)

- [ ] **Legal**
  - [ ] Privacy Policy published
  - [ ] Terms of Service published
  - [ ] Cookie consent banner
  - [ ] GDPR compliance verified

---

### 11.7 Future Hardware Evolution

| Feature | Priority | Notes |
|---------|----------|-------|
| Temperature sensor | High | Cold chain market |
| Solar charging | Medium | Extended battery life |
| Smaller form factor | Medium | Small package market |
| Reusable option | Low | Different business model |
| NFC tap activation | Low | Convenience feature |

---

## 12. Appendix

### 12.1 Tools & Services

| Tool | Purpose |
|------|---------|
| GitHub | Code repository |
| Linear | Task/issue tracking |
| Figma | Design collaboration |
| Google Workspace | Documents, email |
| Slack/Discord | Team communication |
| OpenAI/Gemini | LLM for development assistance |

### 12.2 Glossary

| Term | Definition |
|------|------------|
| **Consignee** | The recipient/receiver of cargo; primary buyer of labels |
| **Forwarder** | Company that arranges shipment logistics |
| **Shipper** | Physical carrier (trucking, air, ocean) |
| **Black hole** | Period when cargo has no tracking visibility |
| **Label** | HyperLabel physical tracking device |
| **Soft-SIM** | eSIM technology for global connectivity |
| **PostGIS** | PostgreSQL extension for geospatial data |

### 12.3 Reference Links

**Competitors:**
- [Tive](https://tive.com)
- [Roambee](https://roambee.com)
- [Sensitech](https://sensitech.com)
- [Controlant](https://controlant.com)
- [SODAQ](https://sodaq.com)
- [Sensos](https://sensos.io/label/)
- [G+D Smart Label](https://gi-de.com)
- [Minew](https://minew.com)
- [Reelables](https://reelables.com)

**Technology:**
- [Clerk (Auth)](https://clerk.com)
- [Stripe (Payments)](https://stripe.com)
- [Google Maps Platform](https://developers.google.com/maps)
- [PostGIS](https://postgis.net)

**Hardware & Device:**
- [GPS Tracking API Documentation](https://label.utec.ua/api/docs)

### 12.4 Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| Label reuse scenario? | Andrii T. | TBD |
| Hardware activation mechanism? | Andrii T. | TBD |
| Offline storage capacity? | Andrii T. | TBD |
| 3PL fulfillment partner? | Andrii T. | TBD |
| TAM/SAM/SOM calculation | Denys | Pending |
| Pilot customer identification | Denys | Pending |

### 12.5 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | Denys Chumak | Initial specification |

---

*This document is confidential and intended for HyperLabel team use only.*
