# Research Hub — 8-Week Delivery Plan

## Overview

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Data model + Lead board | Kanban board with CRUD, lead detail page |
| 2 | Scripts + CEO review | Script editor, review workflow, email notifications |
| 3 | Google Calendar integration | Auto-create events, calendar view, scheduling flow |
| 4 | Email automation | Outreach, reminders, thank-you templates + cron triggers |
| 5 | Interview runner | Guided interview mode with timer, script, inline notes |
| 6 | Insights dashboard | Hypothesis scorecard, quote bank, pattern aggregation |
| 7 | Task management + polish | Research tasks board, gift card tracking, stale lead alerts |
| 8 | Testing, Andrii review, launch | End-to-end testing, CEO walkthrough, deploy to production |

---

## Week 1 — Data Model + Lead Board

**Goal:** Working Kanban pipeline for research leads.

### Tasks
- [ ] Add Prisma models: `ResearchLead`, `ResearchTask`, enums (`ResearchPersona`, `ResearchLeadStatus`, `TaskStatus`, `TaskCategory`)
- [ ] Run `prisma db push` to create tables
- [ ] Create API routes: `/api/v1/admin/research/leads` (GET, POST), `/leads/[id]` (GET, PATCH, DELETE), `/leads/[id]/move` (PATCH)
- [ ] Create Zod validation schemas in `lib/validations/research.ts`
- [ ] Build Kanban board component (`components/admin/research/lead-board.tsx`) with drag-and-drop (or click-to-move)
- [ ] Build lead detail page (`/admin/research/leads/[id]`) with profile, status history, notes
- [ ] Build "Add Lead" form (`/admin/research/leads/new`)
- [ ] Add "Research" to admin sidebar nav (both desktop + mobile)
- [ ] Add research dashboard page (`/admin/research`) with pipeline summary stats
- [ ] Seed initial leads from Dec 2025 interviews (if contact info available)

### Key Decisions
- Kanban library: use `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd) OR simple click-to-move buttons
- Lead board columns: Sourced | Contacted | Screened | Scheduled | Completed | Analysed

### Files to Create/Edit
```
NEW:  app/src/app/(admin)/admin/research/page.tsx
NEW:  app/src/app/(admin)/admin/research/leads/page.tsx
NEW:  app/src/app/(admin)/admin/research/leads/[id]/page.tsx
NEW:  app/src/app/(admin)/admin/research/leads/new/page.tsx
NEW:  app/src/app/api/v1/admin/research/leads/route.ts
NEW:  app/src/app/api/v1/admin/research/leads/[id]/route.ts
NEW:  app/src/components/admin/research/lead-board.tsx
NEW:  app/src/components/admin/research/lead-card.tsx
NEW:  app/src/components/admin/research/lead-detail.tsx
NEW:  app/src/components/admin/research/add-lead-form.tsx
NEW:  app/src/lib/validations/research.ts
EDIT: app/prisma/schema.prisma (add models + enums)
EDIT: app/src/components/admin/admin-sidebar-nav.tsx (add Research link)
EDIT: app/src/components/admin/admin-mobile-sidebar.tsx (add Research link)
```

---

## Week 2 — Scripts + CEO Review Workflow

**Goal:** Editable interview scripts with Andrii's review/approve flow.

### Tasks
- [ ] Add Prisma models: `ResearchScript`, `ResearchHypothesis`
- [ ] Create API routes: `/scripts` (GET, POST), `/scripts/[id]` (GET, PATCH, DELETE), `/scripts/[id]/review` (POST)
- [ ] Build script editor page with section-based UI (drag sections, add/remove questions, add probes)
- [ ] Build script list page grouped by persona
- [ ] Build CEO review page: read-only script view + inline comment per question + approve/request-changes buttons
- [ ] Create email templates: `script-review-request.tsx`, `script-review-complete.tsx`
- [ ] Wire review status transitions: DRAFT → IN_REVIEW → APPROVED (or back to DRAFT)
- [ ] Seed hypotheses from `01-RESEARCH-OBJECTIVES.md` (H1-H6)
- [ ] Seed initial scripts from the 3 interview script files created earlier
- [ ] Add hypothesis management page (simple CRUD)

### Files to Create/Edit
```
NEW:  app/src/app/(admin)/admin/research/scripts/page.tsx
NEW:  app/src/app/(admin)/admin/research/scripts/[id]/page.tsx
NEW:  app/src/app/(admin)/admin/research/scripts/[id]/review/page.tsx
NEW:  app/src/app/api/v1/admin/research/scripts/route.ts
NEW:  app/src/app/api/v1/admin/research/scripts/[id]/route.ts
NEW:  app/src/app/api/v1/admin/research/scripts/[id]/review/route.ts
NEW:  app/src/app/api/v1/admin/research/hypotheses/route.ts
NEW:  app/src/components/admin/research/script-editor.tsx
NEW:  app/src/components/admin/research/script-review.tsx
NEW:  app/src/components/admin/research/hypothesis-card.tsx
NEW:  app/src/emails/script-review-request.tsx
NEW:  app/src/emails/script-review-complete.tsx
EDIT: app/prisma/schema.prisma (add ResearchScript, ResearchHypothesis)
EDIT: app/src/lib/validations/research.ts (add script schemas)
```

---

## Week 3 — Google Calendar Integration

**Goal:** Auto-schedule interviews with calendar events and invites.

### Tasks
- [ ] Store Google OAuth token securely (encrypted in DB or env var, not a local JSON file)
- [ ] Build Google Calendar service (`lib/google-calendar.ts`) with create/update/delete/list methods
- [ ] When lead moves to SCHEDULED → auto-create calendar event with consent info in description
- [ ] When lead moves to DECLINED/CANCELLED → cancel calendar event
- [ ] Build calendar view page (`/admin/research/calendar`) showing upcoming interviews
- [ ] Add "Schedule Interview" flow: pick date/time → creates event + sends invite to lead's email
- [ ] Show next upcoming interview on research dashboard
- [ ] Handle calendar event updates (reschedule → update both DB + Google Calendar)

### Files to Create/Edit
```
NEW:  app/src/lib/google-calendar.ts
NEW:  app/src/app/(admin)/admin/research/calendar/page.tsx
NEW:  app/src/app/api/v1/admin/research/calendar/events/route.ts
NEW:  app/src/components/admin/research/calendar-view.tsx
NEW:  app/src/components/admin/research/schedule-interview-dialog.tsx
EDIT: app/src/app/api/v1/admin/research/leads/[id]/route.ts (trigger calendar on status change)
```

### Notes
- Reuse the OAuth token pattern from `create-calendar-event.mjs` but adapt for server-side (store refresh token in DB)
- Consider using Google Calendar event.conferenceData to auto-create Zoom/Meet links
- Calendar view can be a simple week/list view — no need for a full calendar library

---

## Week 4 — Email Automation

**Goal:** Automated outreach, reminders, and follow-ups.

### Tasks
- [ ] Create email templates: `research-outreach.tsx`, `research-scheduled.tsx`, `research-reminder.tsx`, `research-thank-you.tsx`, `research-referral.tsx`
- [ ] Build "Send Outreach" action on lead card (uses template + lead data, previews before sending)
- [ ] Build outreach email customisation dialog (pre-filled template, editable before send)
- [ ] Create cron job: `research-reminders` — 24h before interview, send reminder
- [ ] Create cron job: `research-followup` — auto thank-you after completion
- [ ] Create cron job: `research-referral` — referral request 48h after completion
- [ ] Log all research emails to existing Notification table
- [ ] Add email history to lead detail page

### Files to Create/Edit
```
NEW:  app/src/emails/research-outreach.tsx
NEW:  app/src/emails/research-scheduled.tsx
NEW:  app/src/emails/research-reminder.tsx
NEW:  app/src/emails/research-thank-you.tsx
NEW:  app/src/emails/research-referral.tsx
NEW:  app/src/app/api/v1/admin/research/email/send/route.ts
NEW:  app/src/app/api/cron/research-reminders/route.ts
NEW:  app/src/app/api/cron/research-followup/route.ts
NEW:  app/src/components/admin/research/send-email-dialog.tsx
EDIT: app/src/components/admin/research/lead-detail.tsx (add email history)
```

---

## Week 5 — Interview Runner

**Goal:** Guided interview experience with script, timer, and structured note-taking.

### Tasks
- [ ] Add Prisma model: `ResearchInterview` (if not already added in Week 1)
- [ ] Build interview runner page (`/admin/research/interviews/[id]`)
  - Left panel: script sections with questions and probes (read-only, from approved script)
  - Right panel: note-taking area per section
  - Top bar: timer (auto-start, section time targets), lead info, recording status
  - Bottom: "Complete Interview" button
- [ ] Build interview list page (upcoming + past)
- [ ] Add "Start Interview" action that opens runner with correct script for lead's persona
- [ ] Structured note capture: per-section text + key quotes + hypothesis signals
- [ ] Post-interview summary auto-generated from structured notes
- [ ] After completion: auto-trigger thank-you email + create "Send Gift Card" task

### Files to Create/Edit
```
NEW:  app/src/app/(admin)/admin/research/interviews/page.tsx
NEW:  app/src/app/(admin)/admin/research/interviews/[id]/page.tsx
NEW:  app/src/app/api/v1/admin/research/interviews/route.ts
NEW:  app/src/app/api/v1/admin/research/interviews/[id]/route.ts
NEW:  app/src/components/admin/research/interview-runner.tsx
NEW:  app/src/components/admin/research/interview-timer.tsx
NEW:  app/src/components/admin/research/interview-notes.tsx
NEW:  app/src/components/admin/research/interview-summary.tsx
EDIT: app/prisma/schema.prisma (add ResearchInterview if needed)
```

---

## Week 6 — Insights Dashboard

**Goal:** Aggregate findings across all interviews into actionable insights.

### Tasks
- [ ] Build insights dashboard page (`/admin/research/insights`)
- [ ] Hypothesis scorecard: visual tally of validating/neutral/invalidating signals per hypothesis, with verdict
- [ ] Quote bank: searchable list of all key quotes across interviews, filterable by theme/persona/hypothesis
- [ ] Pain point ranking: auto-extracted from notes, ranked by frequency
- [ ] Persona summary cards: aggregated profile per persona (avg pain score, common tools, price sensitivity)
- [ ] Pilot interest leaderboard: leads ranked by pilot interest score
- [ ] Export: generate research report as markdown (for sharing with investors)
- [ ] API route for aggregated insights

### Files to Create/Edit
```
NEW:  app/src/app/(admin)/admin/research/insights/page.tsx
NEW:  app/src/app/api/v1/admin/research/insights/route.ts
NEW:  app/src/components/admin/research/hypothesis-scorecard.tsx
NEW:  app/src/components/admin/research/quote-bank.tsx
NEW:  app/src/components/admin/research/persona-summary.tsx
NEW:  app/src/components/admin/research/pilot-leaderboard.tsx
NEW:  app/src/components/admin/research/export-report.tsx
```

---

## Week 7 — Task Management + Polish

**Goal:** Research task board, gift card tracking, UX polish.

### Tasks
- [ ] Build research task board (`/admin/research/tasks`) — simple 3-column: To Do | In Progress | Done
- [ ] Auto-create tasks on triggers:
  - Lead → COMPLETED: "Send gift card to [name]", "Write interview summary"
  - Lead → COMPLETED + 48h: "Send referral request to [name]"
  - Script → IN_REVIEW: "Review [script name]" assigned to Andrii
- [ ] Gift card tracking: checkbox on lead detail, filter for "gift card pending"
- [ ] Stale lead detection: highlight leads stuck in CONTACTED >7 days
- [ ] Add cron job: `research-stale-leads` (weekly Monday alert)
- [ ] Polish: loading states, empty states, error handling, mobile responsive
- [ ] Add breadcrumb navigation across research pages
- [ ] Keyboard shortcuts for interview runner (next section, start/stop timer)

### Files to Create/Edit
```
NEW:  app/src/app/(admin)/admin/research/tasks/page.tsx
NEW:  app/src/app/api/v1/admin/research/tasks/route.ts
NEW:  app/src/app/api/v1/admin/research/tasks/[id]/route.ts
NEW:  app/src/app/api/cron/research-stale-leads/route.ts
NEW:  app/src/components/admin/research/task-board.tsx
NEW:  app/src/components/admin/research/task-card.tsx
EDIT: Multiple components for polish pass
```

---

## Week 8 — Testing, CEO Review, Launch

**Goal:** End-to-end validation, Andrii walkthrough, production deploy.

### Tasks
- [ ] Seed demo data: 5 leads across pipeline, 2 scripts (1 approved, 1 in review), 3 completed interviews with notes
- [ ] Walk through full flow: source lead → outreach → schedule → interview → insights
- [ ] CEO walkthrough with Andrii: demo the tool, have him review scripts, test approval flow
- [ ] Capture Andrii's feedback on interview questions — iterate scripts
- [ ] Fix bugs found during testing
- [ ] Add Vercel cron entries for research-reminders, research-followup, research-referral, research-stale-leads
- [ ] Update CLAUDE.md with Research Hub patterns and rules
- [ ] Deploy to production
- [ ] Begin sourcing leads and scheduling real interviews using the tool

### Milestone: First real interview conducted through the Research Hub

---

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Google Calendar token expires | Store refresh token in DB, auto-refresh on API calls |
| Andrii doesn't have admin access | Ensure his Clerk account has admin role, or create a separate "reviewer" role |
| Drag-and-drop complexity on Kanban | Start with click-to-move buttons, add DnD as enhancement |
| Email deliverability for cold outreach | Use existing Resend domain (tip.live), keep volume low, personalise |
| Scope creep | Each week is independently valuable — can ship partial and iterate |

---

## Tech Stack (all existing, no new dependencies except DnD library)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui |
| Backend | Next.js API routes, Prisma 7.3, Neon PostgreSQL |
| Auth | Clerk (existing admin role check) |
| Email | Resend + React Email (existing) |
| Calendar | Google Calendar API (googleapis npm, OAuth2) |
| Cron | Vercel Cron + `withCronLogging()` wrapper (existing) |
| New dep | `@hello-pangea/dnd` for Kanban drag-and-drop (optional) |
