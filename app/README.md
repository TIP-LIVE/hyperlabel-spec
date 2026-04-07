# TIP Application

Cargo tracking platform built with Next.js 16.1.5 (Turbopack). Track shipments door-to-door via IoT labels using cell tower triangulation.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (with PostGIS extension)
- Clerk account (auth)
- Stripe account (payments)
- Google Maps API key

### 1. Install Dependencies

```bash
cd app
npm install
```

### 2. Set Up Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database (required)
DATABASE_URL="postgresql://user:password@localhost:5432/tip"

# Clerk Auth (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_TEAM=price_xxx
STRIPE_PRICE_VOLUME=price_xxx

# Google Maps (required for tracking)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx

# Onomondo IoT (required for device tracking)
ONOMONDO_WEBHOOK_API_KEY=xxx
GOOGLE_GEOLOCATION_API_KEY=xxx

# Email (optional - skip for testing)
RESEND_API_KEY=re_xxx
```

**Clerk redirects:** The app sets `signInFallbackRedirectUrl` and `signUpFallbackRedirectUrl` in code. In Vercel (or any host), remove `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` if present, to avoid deprecation warnings in the console.

### 3. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Seed demo data (optional but recommended)
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Data

After running `npm run db:seed`, you'll have:

| Account | Email | Role |
|---------|-------|------|
| Demo User | demo@tip.live | user |
| Admin | admin@tip.live | admin |

**Demo Shipments:**
- `/track/DEMO001` - Electronics from Shenzhen (in transit)
- `/track/DEMO002` - Manufacturing Parts (delivered)

---

## Project Structure

```
app/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Demo data
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (admin)/       # Admin panel routes
│   │   ├── (auth)/        # Sign-in/sign-up
│   │   ├── (dashboard)/   # Customer portal
│   │   ├── api/           # API routes
│   │   └── track/         # Public tracking
│   ├── components/        # React components
│   ├── emails/            # React Email templates
│   ├── lib/               # Utilities & services
│   └── types/             # TypeScript types
└── public/                # Static assets
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:reset` | Reset database (⚠️ deletes all data) |

---

## Key Routes

### Public
- `/` - Landing page
- `/sign-in` - Sign in
- `/sign-up` - Sign up
- `/track/[code]` - Public tracking page
- `/docs/api` - API documentation

### Customer Portal (auth required)
- `/dashboard` - Overview
- `/shipments` - Shipment list
- `/shipments/new` - Create shipment
- `/shipments/[id]` - Shipment detail
- `/orders` - Order history
- `/buy` - Purchase labels
- `/settings` - Account settings

### Admin Panel (admin role required)
- `/admin` - Overview
- `/admin/users` - User management
- `/admin/labels` - Label inventory
- `/admin/orders` - Order management
- `/admin/devices` - Device health

---

## API Endpoints

See `/docs/api` for full documentation.

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/v1/shipments` | List shipments |
| POST | `/api/v1/shipments` | Create shipment |
| GET | `/api/v1/track/[code]` | Public tracking data |
| POST | `/api/v1/device/onomondo/location-update` | Onomondo location webhook (primary) |
| POST | `/api/v1/device/activate` | Device activation (QR scan) |

---

## Webhooks

### Onomondo (IoT Location Data)

The primary data ingestion endpoint. Receives cell tower location events from Onomondo SIM platform.

| Setting | Value |
|---------|-------|
| **URL** | `/api/v1/device/onomondo/location-update` |
| **Auth** | `X-API-Key` header, `?key=` query param, or shared secret header |
| **Rate limit** | 120 requests/min per API key |
| **Timeout** | Handler returns 200 within ~20ms; all processing is async |
| **Events** | `location`, `network-registration`, `network-deregistration`, `usage`, etc. |

**Payload shape:**
```json
{
  "type": "location",
  "iccid": "8945...",
  "imei": "3567...",
  "time": "2026-03-30T12:00:00Z",
  "network": { "name": "Vodafone", "country": "Germany", "country_code": "DE", "mcc": "262", "mnc": "02" },
  "network_type": "LTE",
  "location": {
    "cell_id": 12345,
    "location_area_code": 678,
    "accuracy": 500,
    "lat": "52.5200",
    "lng": "13.4050"
  }
}
```

**Processing pipeline (runs in `after()` background):**
1. Update `label.lastSeenAt` heartbeat
2. Auto-promote `PENDING` → `IN_TRANSIT` shipments on first location
3. Resolve coordinates (Onomondo → Google Geolocation API → last known cache)
4. Create `LocationEvent` via `processLocationReport()` (with multi-layer dedup)
5. Deferred reverse geocoding (lat/lng → city name via Nominatim)

**Deduplication (4 layers):**
- Deterministic webhook log ID (SHA256 of `iccid:time:type`)
- Exact coordinate dedup (same lat/lng within 5 min)
- Proximity dedup for cell towers (3km radius within 60 min)
- DB unique constraint `[labelId, recordedAt, lat, lng, source]`

**Key rules:**
- Always return 200 within 1000ms (Onomondo circuit breaker)
- Use ICCID (not IMEI) to resolve labels — SIMs move between devices
- Accept string AND numeric lat/lng — Onomondo sends both
- `location` field is optional — non-location events are still heartbeats

> For the full technical deep-dive, see [`docs/DEVICE-LOCATION-SYSTEM.md`](../docs/DEVICE-LOCATION-SYSTEM.md).

### Clerk (Auth)

| Setting | Value |
|---------|-------|
| **URL** | `/api/webhooks/clerk` |
| **Auth** | Svix signature verification (`CLERK_WEBHOOK_SECRET`) |
| **Events** | `user.created`, `user.updated`, `user.deleted` |

Syncs users to local DB. Auto-promotes whitelisted emails to admin role.

### Stripe (Payments)

| Setting | Value |
|---------|-------|
| **URL** | `/api/webhooks/stripe` |
| **Auth** | Stripe signature verification (`STRIPE_WEBHOOK_SECRET`) |
| **Events** | `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed` |

Creates orders, assigns labels to purchasers, triggers confirmation notifications.

---

## Testing Checklist

### Without Real Services (UI only)
1. Start dev server with placeholder env vars
2. Landing page loads ✓
3. Sign-in/sign-up pages render ✓
4. Public tracking pages show "not found" ✓

### With Database Only
1. Set valid `DATABASE_URL`
2. Run `npm run db:push && npm run db:seed`
3. View seeded data in `/admin/*` routes (bypass auth check in dev)

### Full Integration
1. Set all env vars (Clerk, Stripe, Google Maps)
2. Test sign-up flow
3. Test purchase flow
4. Test shipment creation
5. Test tracking page

---

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

Vercel will auto-detect Next.js and configure build settings.

### Manual

```bash
npm run build
npm run start
```

---

## Troubleshooting

### "Clerk publishableKey is missing"
Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`

### "Database connection failed"
- Check `DATABASE_URL` format
- Ensure PostgreSQL is running
- Run `npm run db:generate`

### "Google Maps not loading"
- Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Enable Maps JavaScript API in Google Cloud Console

### Build fails with Prisma error
```bash
npm run db:generate
npm run build
```

---

## License

Proprietary - TIP
