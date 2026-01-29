# HyperLabel - GPS Cargo Tracking

Track your cargo anywhere in the world with real-time GPS tracking labels.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL + Prisma
- **Auth:** Clerk
- **Payments:** Stripe
- **Maps:** Google Maps API

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or use Neon/Supabase)
- Clerk account
- Stripe account (for payments)

### 1. Clone and Install

```bash
cd app
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `STRIPE_SECRET_KEY` - Stripe secret key (for payments)

### 3. Set Up Database

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/     # Protected dashboard pages
│   ├── (marketing)/     # Public marketing pages
│   ├── api/             # API routes
│   │   ├── webhooks/    # Clerk & Stripe webhooks
│   │   └── v1/          # API v1 endpoints
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── shared/          # Shared components
│   ├── layout/          # Layout components
│   ├── dashboard/       # Dashboard components
│   └── tracking/        # Tracking components
├── lib/
│   ├── db/              # Database client
│   └── validations/     # Zod schemas
└── types/               # TypeScript types
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `DEVICE_API_URL` | Device tracking API URL |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma db push` - Push schema changes to database

## Deployment

The app is designed to be deployed on Vercel:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy!

## API Documentation

### Device API

The device tracking data comes from `label.utec.ua/api`. See the [API docs](https://label.utec.ua/api/docs) for more details.

### Internal API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/clerk` | POST | Clerk webhook handler |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/v1/device/report` | POST | Receive device location data |

## License

Proprietary - All rights reserved.
