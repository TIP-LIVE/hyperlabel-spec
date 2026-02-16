# TIP Rebrand Plan

**From:** HyperLabel  
**To:** TIP  
**Domain:** tip.live  
**Date:** February 4, 2026  

---

## 1. Executive Summary

This document outlines the complete rebrand from **HyperLabel** to **TIP** (tip.live). All references to the old brand, domain, and email addresses will be updated across documentation, codebase, and configuration files.

### Brand Assets to Create
- [ ] Logo for TIP (favicon, app icons, email logo)
- [ ] OG image (`/og-image.png`)
- [ ] Android Chrome icons (192x192, 512x512)
- [ ] Apple touch icon

---

## 2. Tagline Suggestions

Since "TIP" is short and punchy, the tagline should complement it with clarity about the value proposition:

| Tagline | Style | Notes |
|---------|-------|-------|
| **TIP — Track It Precisely** | Descriptive | Clear, explains GPS tracking |
| **TIP — See Where It Goes** | Conversational | Simple, friendly |
| **TIP — Know Before They Knock** | Playful | Emphasizes delivery awareness |
| **TIP — Your Cargo, Visible** | Minimalist | Clean, professional |
| **TIP — Real-Time Cargo Visibility** | Enterprise | B2B focused |
| **TIP — Stick. Track. Deliver.** | Action-oriented | Emphasizes simplicity |
| **TIP — Never Lose Sight** | Emotional | Peace of mind |
| **TIP — Tracking Made Simple** | Direct | No frills |
| **TIP — From Here to There, Tracked** | Journey-focused | End-to-end visibility |
| **TIP — The Label That Tracks** | Product-focused | Describes the physical product |

**Recommended:** "TIP — Track It Precisely" or "TIP — Stick. Track. Deliver."

---

## 3. Files to Update

### 3.1 Core Application Files

| File | Changes | Priority |
|------|---------|----------|
| `app/src/app/layout.tsx` | Title, description, OG data, metadataBase URL | HIGH |
| `app/src/app/page.tsx` | Logo text, metadata, header, footer, contact email, FAQ section title | HIGH |
| `app/public/site.webmanifest` | name, short_name | HIGH |
| `app/src/app/sitemap.ts` | Base URL default | HIGH |
| `app/src/app/robots.ts` | Base URL default | HIGH |

### 3.2 Landing & Marketing Components

| File | Changes | Priority |
|------|---------|----------|
| `app/src/components/landing/landing-faq.tsx` | All "HyperLabel" references in Q&A content | HIGH |
| `app/src/components/landing/mobile-nav.tsx` | Logo text | HIGH |

### 3.3 Email Templates

| File | Changes | Priority |
|------|---------|----------|
| `app/src/emails/base-layout.tsx` | Logo URL, alt text, brand name, footer text, links | HIGH |
| `app/src/emails/order-shipped.tsx` | Any brand references | HIGH |
| `app/src/emails/label-activated.tsx` | Any brand references | MEDIUM |
| `app/src/emails/low-battery.tsx` | Any brand references | MEDIUM |
| `app/src/emails/no-signal.tsx` | Any brand references | MEDIUM |
| `app/src/emails/shipment-delivered.tsx` | Any brand references | MEDIUM |

### 3.4 Auth Pages

| File | Changes | Priority |
|------|---------|----------|
| `app/src/app/(auth)/layout.tsx` | Any brand references | MEDIUM |
| `app/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Title/metadata | MEDIUM |
| `app/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Title/metadata | MEDIUM |

### 3.5 Dashboard/Admin Pages

| File | Changes | Priority |
|------|---------|----------|
| `app/src/app/(dashboard)/layout.tsx` | Header logo/brand name | HIGH |
| `app/src/app/(admin)/layout.tsx` | Header logo/brand name | HIGH |
| `app/src/app/(admin)/admin/page.tsx` | Any brand references | LOW |
| `app/src/app/(admin)/admin/users/page.tsx` | Any brand references | LOW |
| `app/src/app/(admin)/admin/labels/page.tsx` | Any brand references | LOW |
| `app/src/app/(admin)/admin/orders/page.tsx` | Any brand references | LOW |

### 3.6 Other App Pages

| File | Changes | Priority |
|------|---------|----------|
| `app/src/app/checkout/success/page.tsx` | Any brand references | MEDIUM |
| `app/src/app/checkout/cancel/page.tsx` | Contact email | MEDIUM |
| `app/src/app/docs/api/page.tsx` | Base URL, brand references | MEDIUM |
| `app/src/app/track/[code]/page.tsx` | Footer brand reference | HIGH |
| `app/src/app/track/[code]/not-found.tsx` | Any brand references | LOW |

### 3.7 Library/Config Files

| File | Changes | Priority |
|------|---------|----------|
| `app/src/lib/email.ts` | FROM_EMAIL default | HIGH |
| `app/src/lib/notifications.ts` | APP_URL default | HIGH |
| `app/src/lib/logger.ts` | Any brand references | LOW |

### 3.8 Database

| File | Changes | Priority |
|------|---------|----------|
| `app/prisma/seed.ts` | Demo user emails, console output | LOW |

### 3.9 CI/DevOps

| File | Changes | Priority |
|------|---------|----------|
| `app/.github/workflows/ci.yml` | Any name references | LOW |
| `app/README.md` | Project title, all references, demo emails | HIGH |

---

## 4. Documentation Files

### 4.1 Main Spec

| File | Changes | Occurrences | Priority |
|------|---------|-------------|----------|
| `SPEC.md` | All "HyperLabel" → "TIP", domain updates | ~74 | HIGH |

### 4.2 Business Documents

| File | Changes | Priority |
|------|---------|----------|
| `docs/INVESTOR-DECK.md` | Title, all brand refs, contact emails, website | HIGH |
| `docs/INVESTOR-TEASER.md` | Title, all brand refs, contact emails | HIGH |
| `docs/BUSINESS-PLAN.md` | All brand refs, contact emails | HIGH |
| `docs/FINANCIAL-MODEL.md` | Any brand references | MEDIUM |
| `docs/index.html` | All brand refs, contact info | MEDIUM |
| `docs/investor-review.html` | All brand refs, contact info | MEDIUM |

### 4.3 Other Markdown Files

| File | Changes | Priority |
|------|---------|----------|
| `LABEL-LIFECYCLE-REVIEW.md` | Any brand references | LOW |
| `ANDRII-MEETING-QUESTIONS.md` | Any brand references | LOW |
| `HyperLabel-Spec-Overview.html` | Title, all brand refs | LOW |

---

## 5. Domain & Email Replacements

### URLs
| Old | New |
|-----|-----|
| `hyperlabel.io` | `tip.live` |
| `hyperlabel.com` | `tip.live` |
| `track.hyperlabel.com` | `tip.live` (or `track.tip.live`) |

### Emails
| Old | New |
|-----|-----|
| `support@hyperlabel.com` | `support@tip.live` |
| `support@hyperlabel.io` | `support@tip.live` |
| `notifications@hyperlabel.com` | `notifications@tip.live` |
| `notifications@hyperlabel.io` | `notifications@tip.live` |
| `andrii@hyperlabel.io` | `andrii@tip.live` |
| `denys@hyperlabel.io` | `denys@tip.live` |
| `demo@hyperlabel.io` | `demo@tip.live` |
| `admin@hyperlabel.io` | `admin@tip.live` |

---

## 6. String Replacements Summary

Execute these replacements in order (most specific first to avoid partial matches):

### Pass 1: URLs (most specific)
```
https://hyperlabel.io → https://tip.live
https://hyperlabel.com → https://tip.live
https://track.hyperlabel.com → https://tip.live
hyperlabel.io/logo.png → tip.live/logo.png
```

### Pass 2: Emails
```
@hyperlabel.io → @tip.live
@hyperlabel.com → @tip.live
```

### Pass 3: Brand Names (case-sensitive)
```
HyperLabel → TIP
hyperlabel → tip
```

### Pass 4: Descriptive Text Updates
Manual review for context-appropriate phrasing:
- "HyperLabel tracking labels" → "TIP tracking labels" or "TIP labels"
- "HyperLabel dashboard" → "TIP dashboard"
- "HyperLabel Warehouse" → "TIP Warehouse"
- "HyperLabel fulfillment" → "TIP fulfillment"

---

## 7. Environment Variables

Update `.env` and `.env.example`:

| Variable | Old Default | New Default |
|----------|-------------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://hyperlabel.io` | `https://tip.live` |
| `FROM_EMAIL` | `HyperLabel <notifications@hyperlabel.io>` | `TIP <notifications@tip.live>` |

---

## 8. Post-Rebrand Checklist

### Code
- [ ] All files updated with new brand name
- [ ] All URLs point to tip.live
- [ ] All email addresses use @tip.live
- [ ] Build passes without errors (`npm run build`)
- [ ] Lint passes (`npm run lint`)

### Assets
- [ ] New favicon.ico created
- [ ] New logo.png uploaded
- [ ] New OG image created
- [ ] Android icons updated (192x192, 512x512)
- [ ] Apple touch icon updated

### External Services
- [ ] Clerk application renamed
- [ ] Stripe account/products updated
- [ ] Domain DNS configured for tip.live
- [ ] Email sending domain verified (tip.live)
- [ ] Google Maps API key updated (if domain-restricted)

### Legal/Admin
- [ ] Update any legal entity names if needed
- [ ] Update privacy policy
- [ ] Update terms of service

---

## 9. Execution Order

1. **Create new brand assets** (logo, icons, OG image)
2. **Update environment variables** (`.env`, deployment configs)
3. **Run automated string replacements** (bulk find/replace)
4. **Manual review** of all files for context-appropriate wording
5. **Update external services** (Clerk, Stripe, DNS)
6. **Test locally** (full flow: sign up → buy → track)
7. **Deploy to staging** for final verification
8. **Deploy to production**

---

## 10. Rollback Plan

If issues arise:
1. Git history preserves all changes
2. Keep old domain active with redirect to tip.live during transition
3. Environment variables can quickly switch back if needed

---

## 11. Files Summary by Action

### Total files requiring changes: ~45

| Category | Files | Estimated Changes |
|----------|-------|-------------------|
| App source code | ~25 | ~80 string replacements |
| Documentation | ~12 | ~150 string replacements |
| Configuration | ~5 | ~10 string replacements |
| Assets | ~5 | Replace files |

---

*Document created: February 4, 2026*  
*Ready for execution when approved*
