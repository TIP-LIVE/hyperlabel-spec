# Claude Code Handoff — TIP Project

**Date:** February 5, 2026  
**Prepared for:** Claude Code (Anthropic CLI)  
**Previous context from:** Cursor IDE session

---

## 1. Project Overview

**TIP** (formerly HyperLabel) is a disposable GPS tracking label for cargo visibility.

| Attribute | Value |
|-----------|-------|
| **Product** | Disposable LTE tracking label ($20-30) |
| **Domain** | **tip.live** (newly acquired) |
| **Target Users** | B2B shippers tracking valuable cargo |
| **Tech Stack** | Next.js 14, TypeScript, Prisma, PostgreSQL/PostGIS |
| **Auth** | Clerk |
| **Payments** | Stripe |
| **Hosting** | Vercel (planned) |

### Key Documents
- `SPEC.md` — Full product specification (6752 lines, comprehensive)
- `docs/INVESTOR-DECK.md` — Investor pitch deck
- `docs/BUSINESS-PLAN.md` — Business plan
- `docs/FINANCIAL-MODEL.md` — 3-year financial projections
- `TIP-REBRAND-PLAN.md` — Rebrand documentation (for reference)

---

## 2. Changes Made This Session

### Rebrand: HyperLabel → TIP

**Completed** a full rebrand across ~45 files:

| Category | Files Changed | Status |
|----------|---------------|--------|
| App source code | 25+ files | ✅ Done |
| Email templates | 6 files | ✅ Done |
| Documentation | 10+ files | ✅ Done |
| Configuration | 5 files | ✅ Done |

**Key replacements:**
- Brand: `HyperLabel` → `TIP`
- Domain: `hyperlabel.io` / `hyperlabel.com` → `tip.live`
- Emails: `*@hyperlabel.io` → `*@tip.live`

### Files NOT rebranded (intentionally)
- `docs/SHOPPING-LIST.md` — References "SeedStage" (separate project, not TIP)
- `TIP-REBRAND-PLAN.md` — Contains old brand names for historical documentation

---

## 3. Current Status & Pending Items

### Domain Setup (In Progress)
User is setting up **tip.live** with:
- **Google Workspace** for email (`support@tip.live`, `notifications@tip.live`, etc.)
- **Namecheap** DNS management

**Current issue:** Google Workspace domain verification failing despite CNAME record being set.

**Troubleshooting done:**
- CNAME record verified via `dig` command
- DNS propagation confirmed
- Possible issue: character confusion (letter L vs digit 1 in subdomain)

### Remaining Setup Tasks
- [ ] Google Workspace verification (tip.live)
- [ ] MX records for email
- [ ] Vercel deployment configuration
- [ ] Environment variables for production
- [ ] New brand assets (logo, favicon, OG image)

---

## 4. Technical Architecture

### App Structure
```
app/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Demo data (emails now @tip.live)
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (admin)/       # Admin panel (dark theme)
│   │   ├── (auth)/        # Sign-in/sign-up (Clerk)
│   │   ├── (dashboard)/   # Customer portal
│   │   ├── api/           # API routes
│   │   └── track/         # Public tracking pages
│   ├── components/        # React components
│   ├── emails/            # React Email templates
│   ├── lib/               # Utilities & services
│   └── types/             # TypeScript types
└── public/                # Static assets
```

### Key Configuration Files
| File | Purpose |
|------|---------|
| `app/src/app/layout.tsx` | Root layout, metadata (now TIP) |
| `app/src/lib/email.ts` | Email sender config (now @tip.live) |
| `app/src/lib/notifications.ts` | Notification URLs (now tip.live) |
| `app/public/site.webmanifest` | PWA manifest (now TIP) |

### Environment Variables Needed
```env
# Database
DATABASE_URL="postgresql://..."

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# Email (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL="TIP <notifications@tip.live>"

# App URL
NEXT_PUBLIC_APP_URL=https://tip.live
```

---

## 5. SPEC.md Quick Reference

### User Flow (9 Steps)
1. Consignee buys label(s)
2. Consignee shares link with Shipper
3. Shipper enters origin address
4. TIP fulfillment links Label ID → Order
5. Shipper receives label(s)
6. **Shipper scans QR** → Creates Shipment (MANDATORY)
7. Shipper activates (pull tab), enters destination, attaches to cargo
8. Consignee tracks cargo
9. Archive after delivery

### Hardware Specs
- Form factor: 10×15cm, 3.5mm thin
- Battery: 2000mAh, ~60 days at 2hr intervals
- Connectivity: LTE Cat-1, eSIM via Onomondo
- Coverage: 180+ countries

### Business Model
- Starter: 1 label
- Team: 5 labels (popular)
- Volume: 10 labels
- Pricing: $20-30 per label

### Key Technical Decisions
- **Single-use labels** — no reactivation
- **Geofence delivery detection** — 100m radius, 30+ min
- **Stuck detection** — No movement >500m for 24+ hours
- **QR scan mandatory** — Creates Shipment record
- **Hybrid architecture** — label.utec.ua for device data, new backend for business logic

---

## 6. Open Questions (from SPEC.md)

| Question | Status |
|----------|--------|
| Hardware activation mechanism (pull tab)? | TBD |
| Offline storage capacity? | TBD |
| Shelf life (battery in storage)? | TBD |
| TAM/SAM/SOM calculation | Pending |
| Pilot customer identification | Pending |

---

## 7. Next Steps (Suggested)

### Immediate
1. Resolve Google Workspace verification for tip.live
2. Set up MX records for email
3. Create brand assets (logo, favicon)

### Short-term
1. Deploy to Vercel with tip.live domain
2. Configure production environment variables
3. Set up Clerk and Stripe for production

### Development
1. Integrate with label.utec.ua device API
2. Implement Onomondo webhook handlers
3. Build real tracking flow with hardware

---

## 8. Useful Commands

```bash
# Development
cd app
npm run dev

# Database
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:seed       # Seed demo data
npm run db:studio     # Open Prisma Studio

# Build & Deploy
npm run build
npm run lint
```

---

## 9. Team

| Name | Role | Contact |
|------|------|---------|
| Denys Chumak | Product Manager | denys@tip.live |
| Andrii Tkachuk | CTO / Hardware | andrii@tip.live |

---

*This document provides context for continuing development in Claude Code.*
