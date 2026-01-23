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
| E1-T4 | CI/CD pipeline | GitHub Actions for lint, test, deploy to Vercel | GitHub Actions, Vercel | 2 |
| E1-T5 | Environment config | .env setup, secrets management, staging/prod split | Vercel, 1Password | 1 |
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
| E9-T4 | Performance check | Load testing, optimize slow queries | Vercel Analytics | 1 |
| E9-T5 | Bug fixes | Fix issues found in testing | Various | 2 |
| E9-T6 | Production deploy | Deploy to production, DNS setup | Vercel, Cloudflare | 1 |
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

**Deliverables:**
- [ ] Market research complete (TAM/SAM/SOM)
- [ ] Competitive analysis done
- [ ] Financial model structure started
- [ ] Teaser draft started

---

##### Weeks 2-3: Feb 1-14 (10 working days) — 70 hours

| Epic | Focus | Hours | Priority |
|------|-------|-------|----------|
| **P2** | Investor Materials — FINISH ⚠️ | 22 | 🔴 DUE FEB 6 |
| **P1** | Research Preparation | 20 | |
| **P4** | Grant Application (start) | 10 | |
| **P6** | Product Management | 10 | |
| **E1** | Project Setup & Infra | 8 | |
| | **Weeks 2-3 Total** | **70** | |

**⚠️ DEADLINE: Feb 6 — Investor materials must be complete!**

**Deliverables:**
- [ ] ⚠️ Teaser (1-pager) DONE
- [ ] ⚠️ Financial Model DONE
- [ ] ⚠️ Business Plan DONE
- [ ] Interview scripts ready
- [ ] 15-20 interviews scheduled
- [ ] Dev environment set up

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
| **Database** | PostgreSQL + PostGIS | Data + geospatial |
| **ORM** | Prisma | Database access |
| **Auth** | Clerk | Authentication |
| **Payments** | Stripe | Checkout, subscriptions |
| **Email** | Resend + React Email | Transactional emails |
| **Maps** | Google Maps API | Tracking visualization |
| **Hosting** | Vercel | Frontend + API |
| **Database Host** | Supabase or Neon | Managed Postgres |
| **CI/CD** | GitHub Actions | Automated testing/deploy |
| **Monitoring** | Vercel Analytics | Performance |

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
| **Framework** | Next.js 14 (App Router) | SSR, API routes, Google-friendly |
| **Language** | TypeScript (strict mode) | Type safety, better AI assistance |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, consistent UI |
| **Database** | Cloud SQL (PostgreSQL 15) + PostGIS | Google Cloud, geospatial native |
| **ORM** | Prisma | Type-safe, great DX |
| **Auth** | Clerk | Fast setup, social login, webhooks |
| **Payments** | Stripe | Industry standard |
| **Email** | Resend | Modern, React Email templates |
| **Maps** | Google Maps JavaScript API | Best global coverage, your expertise |
| **Geocoding** | **LocationIQ** (primary) + Google (fallback) | Cost-effective, see analysis below |
| **Hosting** | Vercel (frontend) + Cloud Run (API if needed) | Edge functions, easy deploy |
| **Storage** | Google Cloud Storage | Images, exports |
| **Monitoring** | Google Cloud Logging + Vercel Analytics | Integrated monitoring |
| **CI/CD** | GitHub Actions → Vercel | Auto-deploy on push |

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
| Vercel | 100GB bandwidth | $0 | $20/mo |
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
  - [ ] Error tracking (Sentry or Vercel)
  - [ ] Uptime monitoring (BetterStack)
  - [ ] Database connection monitoring
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
