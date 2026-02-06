# TIP Application

GPS cargo tracking platform built with Next.js 14.

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

# Email (optional - skip for testing)
RESEND_API_KEY=re_xxx
```

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
| POST | `/api/v1/device/report` | Device location report |

---

## Webhooks

Configure these webhooks in your Clerk/Stripe dashboards:

| Service | URL | Events |
|---------|-----|--------|
| Clerk | `/api/webhooks/clerk` | user.created, user.updated, user.deleted |
| Stripe | `/api/webhooks/stripe` | checkout.session.completed, payment_intent.* |

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
