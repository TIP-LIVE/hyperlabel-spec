# Prompt for Next Thread — Build the Research Hub (Week 4+)

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

### Week 3 (uncommitted — ready to commit)
- Prisma model: `ResearchInterview` (with calendar event tracking, notes, hypothesis signals)
- Google Calendar service (`lib/google-calendar.ts`) — create/update/delete/list events via OAuth2
- Calendar events API routes (`/api/v1/admin/research/calendar/events`, `/events/[id]`)
- Schedule Interview dialog component (date/time picker, duration, notes)
- Calendar view page (`/admin/research/calendar`) — grouped by date, cancel actions
- Dashboard updated with "Upcoming Interviews" card + Calendar nav button
- Lead detail updated with interviews section + "Schedule Interview" button
- Lead move route auto-cancels Google Calendar events when declining/no-show
- All schema changes pushed to database
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` added to `.env.local`

## What to Build Next

Start with **Week 4** from the 8-week plan: Email Automation.

## Key Files to Read First

### Spec & Plan
- `docs/user-research/RESEARCH-HUB-SPEC.md` — Full specification
- `docs/user-research/RESEARCH-HUB-8-WEEK-PLAN.md` — 8-week plan (Week 4 section)

### Existing Research Code (Week 1-3)
- `app/prisma/schema.prisma` — Current schema with all research models
- `app/src/app/(admin)/admin/research/` — Research pages (dashboard, leads, scripts, calendar)
- `app/src/app/api/v1/admin/research/` — Research API routes (leads, scripts, hypotheses, calendar)
- `app/src/components/admin/research/` — Research components
- `app/src/lib/validations/research.ts` — Zod schemas (leads, tasks, scripts, hypotheses, interviews)
- `app/src/lib/google-calendar.ts` — Google Calendar service
- `app/src/lib/status-config.ts` — Status labels/colors

### Architecture Patterns
- `CLAUDE.md` — Project rules, patterns, pitfalls
- `app/src/lib/auth.ts` — Auth helpers (`requireAdmin()`)
- `app/src/lib/email.ts` — Email sending (`sendEmail()`)
- `app/src/lib/cron.ts` — Cron wrapper (`withCronLogging()`)
- `app/src/emails/base-layout.tsx` — Email base layout
- `app/src/emails/script-review-request.tsx` — Example research email template

## Important Rules

- Follow ALL rules in `CLAUDE.md`
- Use `requireAdmin()` for all research API routes
- Use semantic theme tokens (`bg-card`, `text-foreground`) — never hardcoded colors
- Email templates must use existing `BaseLayout`
- Cron jobs must use `withCronLogging()` wrapper
- Database changes via `prisma db push`

## Let's Start

Read the Week 4 plan, then build the email automation: outreach, reminder, thank-you, and referral templates + cron jobs. After Week 4, continue to Week 5 (Interview Runner) and beyond.
