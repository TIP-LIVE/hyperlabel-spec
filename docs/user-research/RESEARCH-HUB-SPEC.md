# Research Hub — Internal Tool Specification

## What Is This

An internal tool inside the TIP admin panel (`/admin/research`) that manages the entire user interview lifecycle: sourcing leads, scheduling calls, running interviews with structured scripts, capturing insights, and synthesising findings into actionable product decisions.

The goal is to make user research as systematic and low-friction as running a sales pipeline — but for learning, not selling.

---

## Problem

Today the interview process is manual and scattered:
- Leads tracked in a spreadsheet (or head)
- Scripts in markdown files
- Scheduling via back-and-forth email
- Notes in random docs
- No structured way to review questions with the CEO before interviews
- No way to aggregate findings across interviews
- Gift card sending is manual
- No connection between research insights and product decisions

## Solution

A Kanban-style research management board inside `/admin/research` with:

1. **Lead/Interviewee Board** — Kanban pipeline: Sourced → Contacted → Screened → Scheduled → Completed → Analysed
2. **Interview Scripts & Questions** — Editable per-persona scripts with CEO review/approval workflow
3. **Calendar Integration** — Google Calendar API to create events, send invites, and show upcoming interviews
4. **Email Automation** — Outreach, reminders, thank-you emails via existing Resend infrastructure
5. **Interview Runner** — Guided interview mode with script, timer, and inline note-taking
6. **Insights Dashboard** — Hypothesis scorecard, quote bank, pattern tracking across all interviews
7. **Task Management** — Research-specific to-dos (send gift card, write summary, contact referral)

---

## User Roles

| Role | Access | Actions |
|------|--------|---------|
| **Admin (Denys)** | Full access | CRUD everything, run interviews, manage pipeline |
| **CEO (Andrii)** | Review access | Review & approve interview questions, view insights dashboard, add comments |

---

## Data Model (new Prisma models)

```prisma
// ── Research Lead (the person we want to interview) ──────────────
model ResearchLead {
  id            String   @id @default(cuid())
  name          String
  email         String?
  linkedIn      String?
  company       String?
  role          String?
  persona       ResearchPersona        // CONSIGNEE, FORWARDER, SHIPPER
  status        ResearchLeadStatus     // SOURCED, CONTACTED, SCREENED, SCHEDULED, COMPLETED, DECLINED, NO_SHOW
  source        String?                // linkedin, referral, cold-email, respondent.io, personal-network
  referredBy    String?                // Lead ID of referrer
  screeningNotes String?
  pilotInterest  Int?                  // 1-5 scale
  giftCardSent   Boolean  @default(false)
  giftCardType   String?              // "amazon-30-gbp"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  interviews    ResearchInterview[]
  tasks         ResearchTask[]
}

// ── Interview (one scheduled/completed conversation) ─────────────
model ResearchInterview {
  id              String   @id @default(cuid())
  leadId          String
  lead            ResearchLead @relation(fields: [leadId], references: [id], onDelete: Cascade)

  scheduledAt     DateTime?
  completedAt     DateTime?
  duration        Int?                  // minutes
  calendarEventId String?              // Google Calendar event ID
  recordingUrl    String?
  transcriptUrl   String?

  // Structured notes
  notes           Json?                // { background: "", currentState: "", painPoints: "", solutionReaction: "", pricing: "", wrapUp: "" }
  keyQuotes       Json?                // [{ quote: "", context: "", theme: "" }]
  hypothesisSignals Json?              // [{ hypothesisId: "H1", signal: "validating|neutral|invalidating", evidence: "" }]

  status          InterviewStatus      // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ── Script (interview question set, with review workflow) ────────
model ResearchScript {
  id            String   @id @default(cuid())
  persona       ResearchPersona
  version       Int      @default(1)
  title         String                  // "Consignee Script v2"
  sections      Json                    // [{ title: "Introduction", duration: 5, questions: [{ text: "", probes: [""] }] }]
  status        ScriptStatus            // DRAFT, IN_REVIEW, APPROVED, ARCHIVED
  reviewedBy    String?                 // userId of reviewer (Andrii)
  reviewNotes   String?                 // CEO feedback
  reviewedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ── Research Task (to-do items tied to research) ─────────────────
model ResearchTask {
  id            String   @id @default(cuid())
  leadId        String?
  lead          ResearchLead? @relation(fields: [leadId], references: [id], onDelete: SetNull)
  title         String
  description   String?
  status        TaskStatus              // TODO, IN_PROGRESS, DONE
  dueDate       DateTime?
  assignee      String?                 // userId
  category      TaskCategory            // OUTREACH, SCHEDULING, FOLLOW_UP, GIFT_CARD, ANALYSIS, REVIEW
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ── Hypothesis (what we're trying to validate) ───────────────────
model ResearchHypothesis {
  id            String   @id @default(cuid())
  code          String   @unique        // "H1", "H2", etc.
  statement     String
  successSignal String
  validating    Int      @default(0)
  neutral       Int      @default(0)
  invalidating  Int      @default(0)
  verdict       String?                 // VALIDATED, INVALIDATED, INCONCLUSIVE
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ── Enums ────────────────────────────────────────────────────────
enum ResearchPersona {
  CONSIGNEE
  FORWARDER
  SHIPPER
}

enum ResearchLeadStatus {
  SOURCED
  CONTACTED
  SCREENED
  SCHEDULED
  COMPLETED
  ANALYSED
  DECLINED
  NO_SHOW
}

enum InterviewStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ScriptStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  ARCHIVED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum TaskCategory {
  OUTREACH
  SCHEDULING
  FOLLOW_UP
  GIFT_CARD
  ANALYSIS
  REVIEW
}
```

---

## Pages & Routes

```
/admin/research                    → Dashboard (pipeline overview, upcoming interviews, hypothesis scorecard)
/admin/research/leads              → Lead board (Kanban) + list view toggle
/admin/research/leads/[id]         → Lead detail (profile, interview history, tasks, notes)
/admin/research/leads/new          → Add new lead form
/admin/research/interviews         → Interview list (upcoming, past)
/admin/research/interviews/[id]    → Interview runner (script, timer, notes, recorder)
/admin/research/scripts            → Script library (per persona, version history)
/admin/research/scripts/[id]       → Script editor + CEO review workflow
/admin/research/scripts/[id]/review → CEO review view (approve/request changes)
/admin/research/insights           → Insights dashboard (hypothesis scorecard, quote bank, patterns)
/admin/research/tasks              → Research task board
/admin/research/calendar           → Calendar view (Google Calendar embedded or custom)
```

---

## API Routes

```
/api/v1/admin/research/leads              GET (list + filter), POST (create)
/api/v1/admin/research/leads/[id]         GET, PATCH, DELETE
/api/v1/admin/research/leads/[id]/move    PATCH (move on board)
/api/v1/admin/research/interviews         GET, POST
/api/v1/admin/research/interviews/[id]    GET, PATCH, DELETE
/api/v1/admin/research/scripts            GET, POST
/api/v1/admin/research/scripts/[id]       GET, PATCH, DELETE
/api/v1/admin/research/scripts/[id]/review POST (submit for review / approve / request changes)
/api/v1/admin/research/tasks              GET, POST
/api/v1/admin/research/tasks/[id]         PATCH, DELETE
/api/v1/admin/research/hypotheses         GET, POST
/api/v1/admin/research/hypotheses/[id]    PATCH
/api/v1/admin/research/insights           GET (aggregated insights)
/api/v1/admin/research/calendar/events    GET, POST (Google Calendar proxy)
/api/v1/admin/research/email/send         POST (send outreach/reminder/thank-you)
```

---

## External Integrations

### Google Calendar
- **Auth**: OAuth2 Desktop flow (token already saved from current session)
- **Create events**: When lead moves to SCHEDULED → auto-create calendar event with interview details + consent info in description
- **Sync**: Show upcoming interviews from calendar on dashboard
- **Cancellation**: If lead moves to DECLINED/NO_SHOW → cancel calendar event

### Email (Resend — existing infrastructure)
- **Outreach email**: When lead moves SOURCED → CONTACTED, option to send templated outreach
- **Scheduling email**: After calendar event created, send Calendly-like invite
- **Reminder email**: 24h before interview (cron job)
- **Thank-you email**: When interview marked COMPLETED, auto-trigger thank-you + gift card link
- **Referral request**: 48h after interview, send referral ask

### Future / Nice-to-Have
- **Zoom API**: Auto-create meeting links
- **Grain/Otter API**: Auto-import transcripts
- **LinkedIn API**: Enrich lead profiles
- **Notion/Google Sheets export**: For sharing with stakeholders

---

## CEO Review Workflow (Andrii)

The review flow for interview questions:

1. **Denys** creates/updates a script → status: `DRAFT`
2. **Denys** submits for review → status: `IN_REVIEW`, Andrii gets email notification
3. **Andrii** opens `/admin/research/scripts/[id]/review`
   - Sees each section + questions
   - Can add inline comments per question
   - Can approve or request changes
4. If **approved** → status: `APPROVED`, Denys notified
5. If **changes requested** → status: `DRAFT` with review notes, Denys notified
6. Only `APPROVED` scripts can be used in interview runner

**Why review with Andrii?**
- Validates questions align with business strategy
- Catches assumptions from product perspective
- Ensures we ask about partnerships, pricing, and market positioning
- CEO buy-in on research methodology builds trust in findings

---

## Email Templates (new, using existing React Email pattern)

| Template | Trigger | Content |
|----------|---------|---------|
| `research-outreach.tsx` | Lead → CONTACTED | Personalised intro, research description, Calendly link |
| `research-scheduled.tsx` | Lead → SCHEDULED | Confirmation, consent form, what to expect, Zoom link |
| `research-reminder.tsx` | 24h before interview | Friendly reminder, Zoom link, option to reschedule |
| `research-thank-you.tsx` | Interview → COMPLETED | Thank you, gift card link, referral ask |
| `research-referral.tsx` | 48h after completion | Specific referral request based on interview content |
| `script-review-request.tsx` | Script → IN_REVIEW | Notify Andrii, link to review page |
| `script-review-complete.tsx` | Script approved/changes | Notify Denys of review outcome |

---

## Automation Rules (cron jobs)

| Job | Schedule | Action |
|-----|----------|--------|
| `research-reminders` | Daily 09:00 | Send 24h-before reminders for tomorrow's interviews |
| `research-followup` | Daily 10:00 | Send thank-you if interview completed yesterday + no thank-you sent |
| `research-referral` | Daily 10:00 | Send referral request if interview completed 48h ago |
| `research-stale-leads` | Weekly Mon 09:00 | Flag leads stuck in CONTACTED for >7 days |
| `research-gift-cards` | Daily 11:00 | Remind admin to send gift cards for completed interviews |

---

## Key Metrics (Dashboard)

| Metric | Source |
|--------|--------|
| Pipeline: X sourced, Y contacted, Z scheduled, W completed | Lead counts by status |
| Completion rate | Completed / (Completed + No-show + Declined) |
| Interviews this week / target | Interview count vs weekly goal |
| Hypothesis scorecard | Validating / Neutral / Invalidating per hypothesis |
| Top pain points | Extracted from structured notes |
| Pilot interest | Average score + list of high-interest leads |
| Gift cards pending | Completed interviews without giftCardSent=true |
| Referrals generated | Count of leads with referredBy filled |
