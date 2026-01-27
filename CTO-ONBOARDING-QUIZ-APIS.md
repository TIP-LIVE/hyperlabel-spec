# Onboarding Quiz - API Requirements for CTO Review

## Overview

Building a new user onboarding quiz at `/onboarding` route. Goal: new user completes quiz → has a running campaign.

**My responsibility**: Frontend quiz UI (isolated module, no changes to existing code)
**Your review needed**: Confirm existing APIs work for my use case + 1 potential new endpoint

---

## Existing Endpoints I Will Use

### 1. Authentication (Clerk)
```
POST /auth/* (handled by Clerk)
```
**Why**: User must authenticate before connecting LinkedIn or creating campaigns.

**My usage**: Standard Clerk flow, redirect to quiz after auth.

---

### 2. Organization
```
PATCH /organization/:id
Body: { website?: string, bookingLink?: string }
```
**Why**: 
- Store company website URL (used for AI persona generation)
- Store booking link (required for campaigns)

**My usage**: Called after user enters website URL and booking link in quiz steps.

---

### 3. LinkedIn Connection
```
POST /linked-account/connect
Body: { organizationId: string, provider: 'LINKEDIN' }
Response: { url: string } → Opens Unipile OAuth
```
**Why**: Campaign requires at least one connected LinkedIn account.

**My usage**: Open OAuth popup, then poll for connection status.

**Question**: Is there a webhook for connection complete, or should I poll `GET /linked-account/:id`?

---

### 4. LinkedIn Profile Analysis
```
POST /linked-account/:id/analyze
```
**Why**: Analyze user's LinkedIn profile to personalize outreach messaging.

**My usage**: Called after LinkedIn connection confirmed, show loading state while analyzing.

---

### 5. Persona Source Ingestion
```
POST /personas/sources
Body: { type: 'website', url: string, organizationId: string }
Response: { id: string } // ICP source ID
```
**Why**: Scrape company website to extract ICP data for AI persona generation.

**My usage**: Called when user provides website URL. Store `icpSourceId` for persona generation.

---

### 6. Persona Generation (from ICP Source)
```
POST /personas/generate
Body: { icpSourceId: string, organizationId: string }
Response: { personas: Persona[] } // Multiple generated personas
```
**Why**: AI generates 2-4 personas with LinkedIn search params, pain points, etc.

**My usage**: User selects which generated personas to use for their campaign.

**Question**: Does this return `previewContacts` or `totalContacts` per persona?

---

### 7. Create Persona
```
POST /personas
Body: { 
  fullName: string,
  description: string,
  linkedinParams: PersonaLinkedinParams,
  organizationId: string,
  // ... other fields
}
Response: { id: string, totalContacts: number, previewContactIds?: string[] }
```
**Why**: Save the selected/configured persona.

**My usage**: After user confirms persona selection, save to get `personaId` for campaign.

---

### 8. Preview Contacts
```
GET /personas/:id/contacts?limit=5
```
or
```
GET /personas/preview-contacts
Body: { linkedinParams: PersonaLinkedinParams, limit: number }
```
**Why**: Show user sample contacts matching their persona before they pay.

**Question**: Which endpoint exists for this? Need to show ~5 preview contacts with ICP scores.

---

### 9. Create Campaign
```
POST /campaigns
Body: {
  name: string,
  linkedAccountIds: string[],
  goal: string,
  personaIds: string[],
  startTime: string,
  endTime: string,
  activeDays: DayOfWeek[],
  bookingLink: string,
  timezone: string,
  startDate: Date,
  daysBetweenFollowUps: number,
  followUpsNumber: number,
  autoReplenishContacts: boolean,
  socialProofs: string[],
  offerings: string[],
  caseStudies: string[],
}
```
**Why**: Create the actual campaign after payment succeeds.

**My usage**: Called on Stripe checkout success webhook/redirect.

---

### 10. Stripe Checkout
```
POST /stripe/checkout-session
Body: {
  priceId: string,  // 'price_full_monthly' or 'price_trial_2week'
  successUrl: string,
  cancelUrl: string,
  metadata: { organizationId, campaignConfig }
}
Response: { url: string } → Redirect to Stripe
```
**Why**: Process $200/month or $49 trial payment.

**My usage**: Redirect user to Stripe checkout, handle success callback.

**Question**: Are these Stripe price IDs configured?
- `price_full_monthly` ($200/month recurring)
- `price_trial_2week` ($49 one-time, converts to $200/month after 14 days)

---

## New Endpoint (Phase 2 - Optional)

### Natural Language to LinkedIn Params
```
POST /personas/parse-description
Body: { 
  description: string,  // "CTOs at fintech startups in the US"
  isSalesNavigator?: boolean 
}
Response: {
  personaName: string,
  personaDescription: string,
  linkedinParams: PersonaLinkedinParams,
  confidence: number,  // 0-1
  suggestions?: string[]
}
```

**Why**: Alternative persona creation path. Instead of requiring a website URL, user describes their ideal customer in plain text, AI parses into LinkedIn search params.

**Example**:
```
Input:  "CTOs and VPs of Engineering at Series A-C fintech startups in the US"
Output: {
  jobTitles: ["CTO", "Chief Technology Officer", "VP Engineering"],
  industries: ["Fintech", "Financial Services"],
  locations: ["United States"],
  companyHeadcount: { min: 11, max: 500 },
  seniority: ["c_level", "vp"]
}
```

**Priority**: Phase 2 - Quiz works without this using existing `POST /personas/generate` from website URL.

**Implementation**: Requires AI service endpoint. I can write the NestJS controller/service if you provide the AI endpoint spec.

---

## Questions for You

1. **Preview contacts endpoint** - Which endpoint returns sample contacts for a persona? Need to show ~5 contacts with ICP scores before payment.

2. **LinkedIn connection status** - Webhook or polling for Unipile OAuth completion?

3. **Sales Navigator detection** - How do I check if connected account has Sales Navigator?

4. **Stripe prices** - Are `price_full_monthly` ($200) and `price_trial_2week` ($49) configured?

5. **Persona generation response** - Does `POST /personas/generate` include preview contacts and audience size?

---

## What I'm Building (No Backend Changes)

```
frontend/src/
├── app/onboarding/           # New route (isolated)
│   ├── layout.tsx
│   ├── page.tsx
│   └── [...step]/page.tsx
└── modules/onboarding/       # New module (isolated)
    ├── steps/                # Quiz step components
    ├── components/           # UI components
    └── hooks/                # State management
```

**I will not modify**:
- Any existing backend code
- Any existing frontend modules
- Dashboard or organization pages

---

## Timeline

| Week | My Work | Your Involvement |
|------|---------|------------------|
| 1-2 | Quiz UI + existing API integration | Answer questions above |
| 3 | Testing + polish | None |
| 4 | (If Phase 2) Path B frontend | Review new endpoint PR |

---

## Next Step

Quick call to confirm:
1. Answers to 5 questions above
2. Stripe price configuration
3. Any concerns with my API usage

Let me know when works for you.
