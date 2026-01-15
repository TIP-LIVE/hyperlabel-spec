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
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           USER JOURNEY                                                     │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┤
│   BUY     │  ENTER    │  SHARE    │  ENTER    │  RECEIVE  │  SCAN &   │  TRANSIT  │  DELIVER  │  ARCHIVE  │
│  LABEL    │   DEST    │   LINK    │  ORIGIN   │  LABEL    │  ATTACH   │           │           │           │
├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┤
│★Consignee │★Consignee │★Consignee │ Forwarder │ Forwarder │ Forwarder │  Shipper  │★Consignee │  Service  │
│  (buyer)  │  (buyer)  │  (buyer)  │ (origin)  │ (origin)  │ (origin)  │ (carrier) │ (receiver)│   Team    │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
```

**Key Flow:** 
1. Consignee buys label & enters their destination
2. Consignee shares link with Forwarder  
3. Forwarder enters origin address → Label ships to them
4. Forwarder scans QR & attaches to cargo
5. Cargo transits → Consignee receives

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

### 3.3 Secondary Persona: Forwarder (Sender)

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
2. Automotive parts (B2B shipments)
3. E-commerce high-value goods (luxury items, collectibles)

**Future Expansion:**
- Pharmaceuticals (requires cold chain sensors)
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
| GPS/GNSS | Latitude, Longitude | Every 15-30 min |
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
| **In Coverage** | Transmit every 15-30 minutes |
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
│  2. ENTER DESTINATION (Consignee)                               │
│           │    Consignee enters their own delivery address       │
│           ▼                                                      │
│  3. SHARE LINK (Consignee → Forwarder)                          │
│           │    Consignee sends link to forwarder                 │
│           ▼                                                      │
│  4. ENTER ORIGIN (Forwarder)                                    │
│           │    Forwarder clicks link, enters their address       │
│           │    → Label ships to forwarder                        │
│           ▼                                                      │
│  5. RECEIVE LABEL (Forwarder)                                   │
│           │    Label arrives at forwarder with quick-start guide │
│           ▼                                                      │
│  6. SCAN & LINK (Forwarder)                                     │
│           │    Scan QR → enter cargo details → attach to cargo   │
│           ▼                                                      │
│  7. TRANSIT (Shipper)                                           │
│           │    Cargo moves, label transmits every 15-30 min      │
│           ▼                                                      │
│  8. DELIVERED (Consignee)                                       │
│                Cargo arrives, notification sent, tracking ends   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight:** The Consignee (buyer) may not know the forwarder's exact address. They share a link so the forwarder can enter their own origin address. This triggers label shipment to the forwarder.

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

| Event | Trigger | Recipients |
|-------|---------|------------|
| Label Activated | Label begins transmitting | Owner |
| Shipment Delivered | Label detects final location | Owner |
| Low Battery | Battery drops below 20%, 10% | Owner |
| Extended No-Signal | No transmission for >24 hours | Owner |

#### Post-MVP Notifications

- SMS alerts
- Mobile push notifications
- Delay/deviation alerts (predictive)

### 5.6 Data Retention

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Location history | 90 days post-delivery | Free tier |
| Account data | Until account deletion | GDPR compliant |
| Exported data | User responsibility | CSV download available |

**Future:** Extended retention as premium feature

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
- **Platform Team:** Backend API that receives and processes data

### 6.4 API Design

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

#### Public Tracking Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/public/track/{code}` | Public tracking page data |

### 6.5 Database Schema (Simplified)

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

### 6.6 Scalability

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

### 6.7 Data Residency

| Requirement | MVP Approach |
|-------------|--------------|
| Primary Region | US (GCP us-central1) |
| GDPR Compliance | Required for EU customers |
| Multi-region | Post-MVP for enterprise |

### 6.8 Uptime & SLA

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
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │                │
│  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐        │
│  │Denys Chumak │    │Andrii Pavlov│    │ Development │        │
│  │   Product   │    │   Design    │    │   Team      │        │
│  │  (Part-time)│    │ (Part-time) │    │(Out of scope│        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Roles & Responsibilities

#### Andrii Tkachuk - Founder
- Hardware device development
- Manufacturing relationships
- Business strategy
- Funding/investors

#### Denys Chumak - Product Manager (Part-time, 3 months)
- Product specification
- Feature prioritization
- User interviews
- Business plan
- Investor materials
- Platform oversight

**Arrangement:**
- Rate: £50/hour
- Hours: ~229 hours
- Total: £11,450
- Post-MVP: Consider full-time role (20% equity, 2-year vest, 6-month cliff)

#### Andrii Pavlov - Designer (Part-time)
- Brand strategy & identity
- Landing page design
- UI kit (customer portal)
- UI kit (admin panel)

**Arrangement:**
- Rate: £50/hour
- Hours: ~70 hours
- Total: £3,500

#### Development Team
- Out of scope for this document
- Separate budget allocation

### 10.3 Budget Summary

| Category | Item | Amount |
|----------|------|--------|
| **Product** | Denys Chumak (229 hrs @ £50) | £11,450 |
| **Design** | Andrii Pavlov (70 hrs @ £50) | £3,500 |
| **Services** | Website hosting, domain, etc. | £300 |
| **Services** | User interviews (recruitment, gifts) | £2,000 |
| **TOTAL** | | **£17,250** |

*Note: Development & QA costs tracked separately*

### 10.4 Deliverables (3-Month MVP)

#### Product (Denys)

| Deliverable | Description |
|-------------|-------------|
| Web (All Users) | Sign Up/Sign In, Tracking dashboard |
| Web (Landing) | Landing page + CTA (buy) |
| Web (Admin) | Core operations panel |
| Backend | Core services (tracking, location history) |
| APIs | Tracking endpoints |
| Payment | Stripe integration |
| CI/CD | Automated deployment |
| Investor Deck | Basic pitch presentation |
| Teaser | One-pager for investors |
| Financial Model | Revenue/cost projections |
| User Interviews | Conduct + analyze |
| Business Plan | Market strategy document |
| SLA Definition | Service level agreement |

#### Design (Andrii Pavlov)

| Deliverable | Description |
|-------------|-------------|
| Landing Page | Marketing site design |
| UI Kit (Users) | Customer portal components |
| UI Kit (Admin) | Admin panel components |
| Brand Identity | Logo, colors, typography |

---

## 11. Roadmap

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
| Enter final destination | Consignee (buyer) | ✅ | |
| Share link with forwarder | Consignee (buyer) | ✅ | |
| Enter forwarder address (origin) | Forwarder | ✅ | |
| Receive label | Forwarder | ✅ | |
| Scan QR & link to cargo | Forwarder | ✅ | |
| Activate & attach label | Forwarder | ✅ | |
| Share tracking link | Consignee / Forwarder | ✅ | |
| Track cargo location | Anyone with link | ✅ | |
| View location history | Anyone with link | ✅ | |
| Live map view | Anyone with link | ✅ | |
| Receive delivery notification | Consignee | ✅ | |
| Track transport type | — | | ✅ |
| Track delivery delays | — | | ✅ |
| Track route deviations | — | | ✅ |
| Expected delivery date | — | | ✅ |

### 11.3 Delivery Stages

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     CARGO DELIVERY STAGES                                            │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┬─────────────────┤
│   BUY &   │  SHARE    │  ENTER    │  RECEIVE  │  SCAN &   │  TRANSIT  │  DELIVER  │     ARCHIVE     │
│   DEST    │   LINK    │  ORIGIN   │  LABEL    │  ATTACH   │           │           │                 │
├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼─────────────────┤
│ Consignee │ Consignee │ Forwarder │ Forwarder │ Forwarder │ Cargo     │ Cargo     │ Data retained   │
│ buys,     │ sends     │ enters    │ gets      │ scans QR, │ moves     │ arrives   │ 90 days         │
│ enters    │ link to   │ their     │ label     │ attaches  │ through   │ at        │                 │
│ dest addr │ forwarder │ address   │           │ to cargo  │ carriers  │ consignee │                 │
├───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼───────────┼─────────────────┤
│ Platform: │ Platform: │ Platform: │           │ Platform: │ Platform: │ Platform: │ Platform:       │
│ Checkout  │ Share     │ Address   │           │ Activation│ Live track│ Delivery  │ Export          │
│ Order     │ flow      │ capture   │           │ Shipment  │ Map view  │ detection │ Delete          │
│           │           │ → Ship    │           │ creation  │ Alerts    │ Complete  │                 │
└───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┴─────────────────┘
```

### 11.4 Post-MVP Roadmap

| Phase | Timeline | Key Features |
|-------|----------|--------------|
| **MVP** | Month 1-3 | Core tracking, purchase, sharing |
| **Phase 2** | Month 4-6 | Mobile app, SMS notifications, analytics |
| **Phase 3** | Month 7-9 | Delay prediction, route deviation alerts |
| **Phase 4** | Month 10-12 | TMS integrations, enterprise features |
| **Year 2** | 12+ months | Cold chain, white-label, international expansion |

### 11.5 Future Hardware Evolution

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
