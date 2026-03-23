# Prompt for Next Thread — Build the Research Hub (Week 6+)

Copy everything below into a new Claude Code conversation.

---

## Context

I'm building TIP (tip.live), a cargo tracking SaaS. We're building an internal **Research Hub** inside the admin panel (`/admin/research`) to manage user interviews across 3 personas (Consignee, Forwarder, Shipper).

## What's Done

### Week 1 (committed: `9f72b25`)
- Prisma models: `ResearchLead`, `ResearchTask`, enums (`ResearchPersona`, `ResearchLeadStatus`, `ResearchTaskStatus`, `ResearchTaskCategory`)
- Lead CRUD API routes (`/api/v1/admin/research/leads`, `/leads/[id]`, `/leads/[id]/move`)
- Kanban lead board with drag-to-move, search, persona filter
- Lead detail page, add lead form
- Research dashboard with pipeline stats, persona breakdown
- Admin sidebar links (desktop + mobile)

### Week 2 (committed: `a8beba1`)
- Prisma models: `ResearchScript`, `ResearchHypothesis`, enums (`ScriptStatus`, `InterviewStatus`)
- Script CRUD API routes with state machine (DRAFT → IN_REVIEW → APPROVED)
- Hypothesis CRUD API routes with signal tracking
- Script list, editor, and CEO review pages
- Email templates: `script-review-request.tsx`, `script-review-complete.tsx`
- Seed script: 6 hypotheses (H1-H6) + 3 interview scripts
- Dashboard updated with script status + hypothesis scorecard

### Weeks 3-4 (committed: `bbb4095`)
- Prisma model: `ResearchInterview`, `ResearchEmailLog`
- Google Calendar service (`lib/google-calendar.ts`) — create/update/delete/list events via OAuth2
- Calendar events API routes + Schedule Interview dialog
- Calendar view page (`/admin/research/calendar`)
- 5 email templates: outreach, scheduled, reminder, thank-you, referral
- Email send API route + Send Email dialog
- 3 cron jobs: `research-reminders`, `research-followup`, `research-referral`
- Email history on lead detail page

### Week 5 (committed: `6d9aa4d`)
- Interview API routes: `GET /interviews`, `GET /interviews/[id]`, `PATCH /interviews/[id]`
- Interview list page (`/admin/research/interviews`) — upcoming + past interviews
- Interview runner page (`/admin/research/interviews/[id]`) — two-panel layout:
  - Left panel: approved script sections with questions and probes, section navigation dots
  - Right panel: tabbed notes (per-section notes, key quotes, hypothesis signals)
  - Top bar: lead info, persona badge, timer with play/pause/reset, save/complete buttons
- Interview timer component with target time tracking and overtime indicator
- Interview notes component with auto-save (30s), structured note capture
- Hypothesis signal tracking: per-signal hypothesis selector, validating/neutral/invalidating, evidence
- Key quote capture with context and theme tagging
- Auto-transition: completing interview moves lead to COMPLETED status
- Dashboard updated: upcoming interviews link to runner, Interviews nav button added
- Lead detail updated: Start/Continue/View links on interview cards

### Week 6 (committed: `be47c28`)
- Insights dashboard page (`/admin/research/insights`)
- Hypothesis scorecard with expandable interview signals
- Quote bank: searchable/filterable quote collection
- Pain point ranking: auto-derived from quote themes
- Persona summary cards: lead count, interview count, avg pilot interest, top themes
- Pilot interest leaderboard: ranked by pilotInterest score
- Export report button (PDF/CSV)
- Insights API route aggregating data from completed interviews

### Week 7 (uncommitted — ready to commit)
- Task CRUD API routes (`/tasks` GET/POST, `/tasks/[id]` GET/PATCH/DELETE)
- Task board page (`/admin/research/tasks`) — 3-column layout: To Do | In Progress | Done
- Task card component with category badge, lead link, due date, overdue highlighting
- Auto-create tasks on triggers:
  - Interview completed → "Send gift card to [name]" + "Write interview summary for [name]"
  - Script submitted for review → "Review script: [title]" assigned to Andrii
- Gift card tracking: "Mark as sent" button on completed lead profiles
- Stale lead detection: yellow border + warning on leads in CONTACTED >7 days
- Stale leads cron job (`research-stale-leads`) — weekly alert email
- Breadcrumb navigation across all research pages
- Tasks nav button added to dashboard header
- Dashboard tasks section: live counts (To Do / In Progress / Done) with link to board
- Keyboard shortcuts for interview runner: arrow keys (section nav), Cmd+S (save)

## What to Build Next

Start with **Week 8** from the 8-week plan: Testing, CEO Review, Launch.

## Key Files to Read First

### Spec & Plan
- `docs/user-research/RESEARCH-HUB-SPEC.md` — Full specification
- `docs/user-research/RESEARCH-HUB-8-WEEK-PLAN.md` — 8-week plan (Week 6 section)

### Existing Research Code (Week 1-5)
- `app/prisma/schema.prisma` — Current schema with all research models
- `app/src/app/(admin)/admin/research/` — Research pages (dashboard, leads, scripts, calendar, interviews)
- `app/src/app/api/v1/admin/research/` — Research API routes (leads, scripts, hypotheses, calendar, email, interviews)
- `app/src/components/admin/research/` — Research components (interview-runner, interview-timer, interview-notes, etc.)
- `app/src/lib/validations/research.ts` — Zod schemas
- `app/src/lib/google-calendar.ts` — Google Calendar service
- `app/src/lib/status-config.ts` — Status labels/colors
- `app/src/emails/` — Email templates (research-*.tsx)
- `app/src/app/api/cron/research-*/` — Research cron jobs

### Architecture Patterns
- `CLAUDE.md` — Project rules, patterns, pitfalls
- `app/src/lib/auth.ts` — Auth helpers (`requireAdmin()`)
- `app/src/lib/email.ts` — Email sending (`sendEmail()`)
- `app/src/lib/cron.ts` — Cron wrapper (`withCronLogging()`)
- `app/src/lib/api-utils.ts` — API error handler (`handleApiError()`)

## Important Rules

- Follow ALL rules in `CLAUDE.md`
- Use `requireAdmin()` for all research API routes
- Use semantic theme tokens (`bg-card`, `text-foreground`) — never hardcoded colors
- Email templates must use existing `BaseLayout`
- Cron jobs must use `withCronLogging()` wrapper
- Database changes via `prisma db push`

## Let's Start

Read the Week 8 plan, then execute: seed demo data, walk through full flow, fix bugs, add Vercel cron entries, update CLAUDE.md, and prepare for CEO walkthrough.
