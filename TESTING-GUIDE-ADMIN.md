# TIP — Admin QA Testing Guide

Companion to [TESTING-GUIDE.md](TESTING-GUIDE.md). This document covers the **admin side** of TIP (tip.live) — internal tooling for TIP staff to manage the warehouse, fulfil orders, monitor the IoT fleet, run user-research interviews, and investigate issues.

If you haven't read the client-side guide yet, please do so first — it gives you the domain vocabulary (labels, dispatches, cargo, shipments, orgs) that the admin UI assumes you already know.

---

## Table of Contents

1. [About the Admin Area](#1-about-the-admin-area)
2. [Who Is an Admin](#2-who-is-an-admin)
3. [Test Environment](#3-test-environment)
4. [How to Report Issues](#4-how-to-report-issues)
5. [Admin Dashboard (Overview)](#5-admin-dashboard-overview)
6. [Label Management](#6-label-management)
7. [Order Management & Creating Dispatches](#7-order-management--creating-dispatches)
8. [Dispatch Admin View (All Users)](#8-dispatch-admin-view-all-users)
9. [Cargo Admin View (All Users)](#9-cargo-admin-view-all-users)
10. [Device Fleet Monitoring](#10-device-fleet-monitoring)
11. [User Management](#11-user-management)
12. [Webhook Logs & Diagnostics](#12-webhook-logs--diagnostics)
13. [Research Hub](#13-research-hub)
14. [Admin-Triggered Emails](#14-admin-triggered-emails)
15. [Admin-Specific State Transitions](#15-admin-specific-state-transitions)
16. [Edge Cases & Security Checks](#16-edge-cases--security-checks)
17. [Appendix: Admin Glossary](#appendix-admin-glossary)

---

## 1. About the Admin Area

The admin area lives at `https://tip.live/admin`. It's a separate section with its own sidebar, visible **only to users whose role is `admin`**. It's where TIP staff do work that customers never see:

- Add new labels into inventory (warehouse scanning).
- Fulfil orders (create outbound label dispatches for paying customers).
- Monitor the entire IoT fleet (battery levels, webhook health, signal freshness).
- Inspect any user's shipments (for support and debugging).
- Promote/demote other users.
- Read webhook payloads from Onomondo when debugging.
- Run the Research Hub — user-interview pipeline with CEO-approved scripts.

**Important:** the admin area has broad visibility across **all organizations**. Treat what you see as sensitive; don't screenshot anything containing real customer data without redacting.

---

## 2. Who Is an Admin

A user becomes an admin one of two ways:

1. Their email is in the `ADMIN_EMAILS` environment variable (comma-separated whitelist). When they sign up, their `role` is auto-set to `admin`.
2. An existing admin promotes them via the **User Management** page (§11).

**To test as admin**, the TIP team will either:
- Add your email to the whitelist and ask you to sign up, or
- Ask you to sign up normally, then promote you via another admin account.

**How to verify you're an admin:**
- The sidebar shows an **Admin** section with links to `/admin`, `/admin/orders`, `/admin/labels`, etc.
- Visiting `/admin` directly loads the overview (rather than redirecting you away).
- Your own profile shows the **admin** role badge.

**Non-admins trying to reach admin URLs** should get a 403/404 or be redirected. Please verify this (try signing in as a non-admin account and pasting `/admin/orders` into the address bar).

---

## 3. Test Environment

- **Production:** https://tip.live/admin
- **Sign-in:** https://tip.live/sign-in
- Admin nav links: `/admin`, `/admin/orders`, `/admin/labels`, `/admin/dispatch`, `/admin/cargo`, `/admin/devices`, `/admin/users`, `/admin/webhooks`, `/admin/research`

---

## 4. How to Report Issues

Same process as the client guide — open issues at **https://github.com/TIP-LIVE/hyperlabel-spec/issues**, label with the section number from this admin guide (e.g. "§7.2 Create Dispatch — receiver email field").

Include:
- URL + click path.
- Screenshot or recording (redact any real customer data: emails, names, addresses).
- Expected vs actual.
- Browser + OS + time.

---

## 5. Admin Dashboard (Overview)

**URL:** `/admin`

### 5.1 What you should see

- **Stat cards** at the top:
  - **Total Users** — clickable, goes to `/admin/users`.
  - **Labels in Inventory** — with breakdown of ACTIVE / DEPLETED counts.
  - **Total Orders** — with pending-fulfilment count.
  - **Active Shipments** — IN_TRANSIT shipments across the platform.

- **Recent Orders panel** — 5 most recent orders with status badges.
- **Low Battery Labels panel** — labels under 20% battery on active shipments.
- **Alerts card (yellow)** — summary of urgent items (pending orders, low battery alerts).

### 5.2 What to test

- Every stat card number matches reality. Cross-check a few (e.g. Total Users against the Users page list count).
- Each clickable card navigates to the correct page.
- Low-battery panel only shows labels that are **actually on an active shipment**, not every label under 20%.
- Page loads quickly even with many records.
- Empty state: if there are zero low-battery labels, that panel should say "All labels healthy" (or similar), not break.

---

## 6. Label Management

### 6.1 Label Inventory

**URL:** `/admin/labels`

**What's there:**
- Filter tabs: **All / INVENTORY / SOLD / ACTIVE / DEPLETED**.
- Search box: by device ID, display ID, IMEI, ICCID, or owner email.
- Paginated table (25 per page).
- Columns: Device ID, Display ID, IMEI, ICCID, Status, Battery, Activated At, Owner.
- Multi-select checkboxes for bulk operations.

**What to test:**
- Each status filter shows only labels in that status.
- Search returns expected results for each field.
- Pagination works forward and back; page count matches total / 25.
- Owner column correctly links to the user/org.
- Sort order is sensible (most recently created first, by default).
- Labels in each status have appropriate columns filled (e.g. ACTIVE labels show battery %, INVENTORY labels don't).

### 6.2 Add Labels to Inventory

**URL:** `/admin/labels/add`

This is how new labels are registered in the system (typically after the factory ships a batch).

**Fields:**
- **Device ID** (required, unique) — the hardware serial.
- **IMEI** (optional) — the device's cellular ID.
- **ICCID** (optional) — the SIM card ID.

**Test:**
1. Add a single label with all three fields → should land in status **INVENTORY**.
2. Add a label with only Device ID → should still work; IMEI/ICCID remain null.
3. Try to add a label with a **duplicate Device ID** → error.
4. Add a **batch** of labels (paste a CSV / multiple rows) if the UI supports it.
5. Check that newly added labels show up in the Inventory list immediately (or after a refresh).

### 6.3 Other label pages to poke at

- `/admin/labels/assign` — if present, assign labels to an order.
- `/admin/labels/generate` — if present, generate a batch of new label IDs.

---

## 7. Order Management & Creating Dispatches

### 7.1 Order List

**URL:** `/admin/orders`

**What's there:**
- Status tabs: **All / PAID (pending fulfilment) / SHIPPED / DELIVERED / CANCELLED**.
- Search by customer email or order ID.
- Columns: Order ID, Organization, Customer email, Quantity, Dispatched/Total labels, Status, Date, Actions.

**What to test:**
- Each status tab filters correctly.
- The "Dispatched / Total" progress indicator updates as dispatches are created.
- Search by email brings up correct orders.
- Clicking the organization name jumps to user management filtered by that org (if that's the intended UX).

### 7.2 Order Detail

**URL:** `/admin/orders/[id]`

**What's there:**
- Order header with status, customer, org, date.
- Label breakdown table (status, battery, which dispatch they're on).
- Dispatch history (direct + any legacy dispatches).
- **Create Dispatch** button (visible only for PAID/SHIPPED orders with undispatched labels).

### 7.3 Create a Dispatch — the critical flow

This is the **core admin workflow** and must work flawlessly.

**Steps:**
1. On a PAID order with undispatched labels, click **Create Dispatch**.
2. A form appears asking for:
   - **Dispatch name** (e.g. "Acme Logistics — Jan batch").
   - **Label count** (how many of the order's remaining labels to put on this dispatch).
   - **Receiver details** — two modes:
     - *I have the receiver's address* — fill in name, email, phone, address lines, city, state, postal code, country.
     - *Ask the receiver* — system generates a share link for the customer to forward.
3. Submit.

**Expected:**
- A new **LABEL_DISPATCH** shipment is created with status **PENDING**.
- If this is the **first dispatch** on the order, order transitions **PAID → SHIPPED** and the customer receives an **Order Shipped** email.
- A unique **share code** is generated for public tracking.
- If receiver details were provided, `addressSubmittedAt` is set to now; otherwise, a 14-day expiring share link is generated.
- The dispatch appears in the order's dispatch history and in `/admin/dispatch`.

**Test each permutation:**
- Create with full receiver details → verify order → SHIPPED, customer emailed.
- Create with "ask receiver" → verify share link works and expires 14 days later.
- Create a **second** dispatch on the same order (for the remaining labels) → order stays SHIPPED, no duplicate "Order Shipped" email.
- Try to create a dispatch with **0 labels** → blocked.
- Try to create a dispatch with **more labels than available** → blocked.
- Try to create a dispatch on a **DELIVERED** order → button should be hidden or disabled.

### 7.4 Linking labels to a dispatch (scan workflow)

When TIP is physically packing the box:

1. Open the dispatch detail page (admin side).
2. Click **Verify Labels** or **Scan Labels**.
3. Scan each physical label's QR code one by one, or paste device IDs.

**Expected:**
- Each scanned label is added to the dispatch (`ShipmentLabel` record created).
- Label status changes **SOLD → ACTIVE** (or whichever is appropriate).
- After the first scan, dispatch status flips **PENDING → IN_TRANSIT**.
- Scanning a label **already on another dispatch** is rejected.
- Scanning a label that doesn't exist is rejected with a clear error.

---

## 8. Dispatch Admin View (All Users)

**URL:** `/admin/dispatch`

This shows **every LABEL_DISPATCH shipment across every organization** — for support and debugging.

**What's there:**
- Status tabs (ALL / PENDING / IN_TRANSIT / DELIVERED / CANCELLED).
- Search by name, share code, address, or customer email.
- Columns: Name, Organization, Shipper email, Labels linked (count), Destination, Status, Date.
- 25 per page.

**What to test:**
- Filter and search work correctly.
- Clicking a dispatch opens `/admin/dispatch/[id]` with the full detail (labels, receiver, location history, webhook activity).
- The admin view shows **more** than a customer would (e.g. webhook logs, internal notes, all labels linked even if the customer shouldn't see them).
- Actions available:
  - Override status (if exposed — try moving PENDING → IN_TRANSIT manually).
  - Cancel (with reason capture).
  - Re-send share link to receiver.
  - Link / unlink labels.

---

## 9. Cargo Admin View (All Users)

**URL:** `/admin/cargo`

Mirrors the dispatch admin view, but for **CARGO_TRACKING** shipments (customer-created cargo tracking).

**What's there:**
- Same filter/search/pagination structure.
- Columns: Shipment Name, Organization, Shipper email, Attached Label (device ID + battery), Destination, Status, Date.

**What to test:**
- Every customer's cargo shipment is visible.
- Searching by device ID finds the cargo that label is currently on.
- Clicking in shows the full customer view plus admin-only fields (internal flags, webhook logs).
- You can **force-deliver** a stuck shipment manually (if the override is exposed).

---

## 10. Device Fleet Monitoring

**URL:** `/admin/devices`

Fleet-wide health dashboard for all **ACTIVE** labels (labels in the wild, reporting).

### 10.1 What's there

- **Fleet stats card**: total active, healthy, low-battery, no-signal counts.
- **Reporting history chart**: events over time (hourly/daily buckets).
- **Search** by device ID or IMEI.
- **Table** with one row per ACTIVE label:
  - Device ID / Display ID.
  - IMEI.
  - Battery % (colour-coded: green / yellow / red).
  - Last signal (time ago, plus city/country if available).
  - Current shipment name (link to shipment).
  - Onomondo SIM link (external, if ICCID known).
  - Geo location (city, country).

### 10.2 What to test

- Stat counts add up (healthy + low-battery + no-signal ≤ total active).
- **No-signal threshold** is 24 hours — labels silent for >24h should show as no-signal.
- **Low battery threshold** is 20% — labels <20% should be marked low-battery.
- Clicking Device ID opens `/admin/devices/[deviceId]` with history.
- "Last signal X min ago" updates correctly as new webhooks arrive.
- Onomondo SIM link goes to the correct external URL.
- Labels that are DEPLETED should **not** show up on this page (it's active-only).

### 10.3 Device detail page

**URL:** `/admin/devices/[deviceId]`

**What you should see:**
- Device header (IDs, current status, linked SIM).
- Location history timeline (every location event, not thinned).
- Battery trend chart.
- Webhook activity (link to filtered `/admin/webhooks` view).
- Currently linked shipment.
- Order history for this label.

**Test:**
- Timeline shows events in reverse chronological order.
- Each event has coordinates, accuracy, battery, source (CELL_TOWER / GPS).
- Excluded events (soft-deleted, e.g. `excludedReason: 'teleportation'`) either don't show or are visibly flagged as excluded.

---

## 11. User Management

**URL:** `/admin/users`

### 11.1 What's there

- Full user list.
- Search by email, first name, last name.
- Columns: Email, Name, Role (admin/user), Order count, Shipment count, Joined date.
- 25 per page.

### 11.2 What to test

- Search by email brings up the right user.
- Clicking order count filters `/admin/orders` to that user's orders.
- Clicking shipment count filters the appropriate shipments list.

### 11.3 Toggle admin role

1. Find a non-admin user.
2. Click **Toggle Role** (or similar button) next to their name.
3. Confirm.

**Expected:**
- Their role flips user ↔ admin.
- On their next request, they can (or cannot) access `/admin` accordingly.
- UI updates immediately (no need to refresh).

**Edge cases:**
- Try to demote **yourself** — the UI should warn or block this (otherwise you could lock yourself out).
- Try to demote the **last remaining admin** — same warning.

---

## 12. Webhook Logs & Diagnostics

**URL:** `/admin/webhooks`

Raw log of every webhook request received from Onomondo (TIP's SIM provider). Critical for debugging why a label isn't reporting.

### 12.1 Stat cards

- **Total Events** (all time).
- **Success Rate** (% with statusCode=200).
- **Avg Duration** (processing time in ms).
- **Pending count** (awaiting processing).

### 12.2 Filters

- Endpoint (dropdown of all known webhook endpoints).
- Status code (pending / 200 / 4xx / 5xx).
- Event type (dropdown: location, network-registration, usage, etc.).
- ICCID (dropdown of SIMs with logs).
- Search by device ID or ICCID.

### 12.3 Log table

Each row expands to show full request headers, body, and processing result. Columns:
- Timestamp.
- Endpoint.
- Event type.
- ICCID (linked to label).
- Status code (colour: green/yellow/red).
- Duration in ms.
- Summary of what TIP did with the event.

### 12.4 What to test

- Filters narrow the table correctly.
- Clicking a row expands to show headers + body JSON + processing result.
- A freshly received webhook appears within seconds (refresh the page).
- Failed webhooks (statusCode ≥ 400) are clearly marked red.
- Duration averages look sane (should usually be under 100 ms given the 1000 ms Onomondo timeout).
- The **processing result** JSON shows what LocationEvent was created (or why one wasn't — e.g. "manufacturing cooldown", "duplicate", "proximity dedup").

---

## 13. Research Hub

**URL:** `/admin/research`

An internal CRM for running user-research interviews. It has its own review workflow where the CEO approves interview scripts and email templates before researchers can use them in the field. Skip this whole section if you're not on the research team — but it still needs QA coverage.

### 13.1 Research Dashboard

**URL:** `/admin/research`

**Stat cards:** Total Leads, Contacted, Scheduled, Completed, Completion Rate %, Interviews This Week, Gift Cards Pending, Referrals Generated.

**Pipeline Kanban** (visual counts at each stage): SOURCED → CONTACTED → SCREENED → SCHEDULED → COMPLETED → ANALYSED. Declines and no-shows listed separately.

**Persona breakdown** (CONSIGNEE / FORWARDER / SHIPPER, each targeting 5–7 interviews).

**Script & Email Template status counts** (DRAFT / IN_REVIEW / APPROVED). An alert shows if scripts are awaiting CEO review.

**Hypotheses scorecard** — per hypothesis, counts of validating / neutral / invalidating signals with a progress bar.

**Upcoming interviews** (next 3).

**Recent leads** (last 5).

**What to test:**
- All counts match the raw data (spot-check a few by going to the underlying pages).
- Quick-access buttons (Insights, Tasks, Interviews, Calendar, Scripts, Emails, Lead Board) all work.
- Empty states when counts are zero make sense.

### 13.2 Lead Board (Kanban)

**URL:** `/admin/research/leads`

Kanban by lead status: columns for SOURCED, CONTACTED, SCREENED, SCHEDULED, COMPLETED, ANALYSED, plus DECLINED / NO_SHOW sidebars.

**Actions to test:**
- Add a new lead (form: name, company, role, email, LinkedIn, persona, source, referrer).
- Drag a lead card between columns → status updates and persists on refresh.
- Open lead detail → modal/drawer with full info, email activity log, linked tasks, interview history.
- Add screening notes / pilot-interest score → save → reflects in detail.
- Filter by persona → only that persona visible.

**Edge cases:**
- Required fields missing on create → validation errors.
- Duplicate email → warn or block.
- Move a COMPLETED lead back to SOURCED → should be allowed (or warn).

### 13.3 Scripts — and the CEO Review Workflow

**URL:** `/admin/research/scripts`

Interview scripts are versioned and must be **CEO-approved** before a researcher can run an interview with them.

**Status machine:** DRAFT → IN_REVIEW → APPROVED (→ ARCHIVED). APPROVED can revert to DRAFT if CEO requests changes.

**Create a new script:**
- Title, persona, sections (each with title, duration, questions, probes).
- Save as Draft.

**Submit for review** (as researcher):
- Script must be DRAFT.
- Click **Submit for Review**.
- Status → IN_REVIEW.
- An auto-task **"Review script: {title}"** is created (assignee: Andrii).
- An email **Script Review Request** is sent to the CEO.

**Review the script** (as CEO):
- Open `/admin/research/scripts/[id]/review` (only opens if status is IN_REVIEW).
- Option A: **Approve** → status → APPROVED, `reviewedBy` + `reviewedAt` set, researcher gets **Script Review Complete (approved)** email.
- Option B: **Request Changes** → status → DRAFT, `reviewNotes` captured, researcher gets **Script Review Complete (changes-requested)** email.

**Test:**
- Submit → task appears + email arrives at CEO.
- Approve → status changes, researcher emailed, script now selectable in Interview Runner.
- Request changes → status reverts, researcher emailed with notes.
- Try to submit a script that is already IN_REVIEW or APPROVED → blocked.
- Non-CEO user trying to approve → should be rejected (403).

### 13.4 Email Templates — Same Review Workflow

**URL:** `/admin/research/email-templates`

Same DRAFT → IN_REVIEW → APPROVED flow as scripts. Used for outreach / follow-up / thank-you / referral emails to leads.

**Fields:** Title, Type (OUTREACH, FOLLOW_UP, THANK_YOU, REFERRAL), Persona, Subject, Body (supports `{{name}}`, `{{company}}` variables).

**Test the whole submit → review → approve (or request changes) cycle** the same way as for scripts.

**Specific to templates:**
- Variables render correctly when template is used in outreach (no raw `{{...}}` leaks).
- APPROVED templates are available in any outreach UI; DRAFT/IN_REVIEW are not.

### 13.5 Interviews List

**URL:** `/admin/research/interviews`

List of all scheduled/completed interviews.

**Columns:** Lead name, Company, Persona, Scheduled date/time, Duration, Status (SCHEDULED / IN_PROGRESS / COMPLETED).

**Test:** Filter by status, persona, date range.

### 13.6 Interview Runner — Two-Panel Live Capture

**URL:** `/admin/research/interviews/[id]`

This is what the researcher uses **during** the interview.

**Layout:**
- **Left panel (script):** the approved script for the lead's persona, with sections, questions, and probes. Optional per-section timer.
- **Right panel (capture):**
  - Lead info (name, company, role, persona).
  - Screening notes (read-only).
  - Pilot interest score (editable).
  - Free-text notes (auto-saved every 30 s or on blur).
  - Key quotes list (each: quote, context, theme — added via modal, auto-saved).
  - Hypothesis signals (per hypothesis, select validating / neutral / invalidating + evidence text, auto-saved).

**Status flow:** SCHEDULED → IN_PROGRESS (click **Start**) → COMPLETED (click **Complete**).

On **Complete**:
- `completedAt` set.
- Lead moves to COMPLETED status.
- Follow-up tasks auto-created (e.g. "Send gift card", "Write summary").

**What to test:**
- Start / Complete buttons transition status.
- Auto-save actually works: make a change, refresh the page — change persists.
- Add/remove key quotes — persists.
- Change hypothesis signals — persists.
- Network drop mid-interview: changes made offline should either queue or surface a clear error (not silently lost).
- Multiple admins editing the same interview simultaneously → last-write-wins is OK but shouldn't corrupt data.

### 13.7 Tasks

**URL:** `/admin/research/tasks`

Kanban board: TODO / IN_PROGRESS / DONE.

**Task fields:** Title, category (REVIEW / FOLLOW_UP / OUTREACH / ANALYSIS / OTHER), status, assignee, due date, linked lead.

**Auto-created tasks:**
- "Review script: {title}" on script submit → assignee: Andrii.
- Post-interview tasks on interview COMPLETED.

**Test:**
- Create / edit / delete tasks.
- Drag between columns.
- Filter by category / assignee.
- Overdue tasks highlighted.

### 13.8 Calendar

**URL:** `/admin/research/calendar`

Month/week view of upcoming scheduled interviews.

**Test:**
- Interviews appear on the correct date/time.
- Clicking an event jumps to that interview's runner page.
- Different personas colour-coded.
- Past vs upcoming clearly distinguished.

### 13.9 Insights

**URL:** `/admin/research/insights`

Aggregates findings across completed interviews.

**Sections to verify:**
- **Stat cards:** Interviews Completed, Hypotheses Tested, Quotes Captured, Pilot Interest.
- **Hypothesis scorecard:** per hypothesis, bar with validating / neutral / invalidating segments.
- **Quote bank:** all key quotes, grouped by theme.
- **Pain-point ranking:** themes sorted by frequency, with persona tags.
- **Persona summaries:** per persona — lead count, interview count, avg pilot interest, top themes.
- **Pilot leaderboard:** top leads by pilot interest score.
- **Export** button — downloads a PDF or JSON (try it).

**Test:**
- Complete a new interview → insights update.
- Numbers match raw interview data.
- Export produces a usable file.

### 13.10 Stale Lead Detection

Weekly cron sends an alert email if leads sit in **CONTACTED** for more than 7 days. These leads get a yellow border on the Lead Board.

**Test:**
- A lead that's been CONTACTED > 7 days has the yellow warning border.
- Moving it forward (to SCREENED) removes the warning.
- (If you can manipulate dates in a staging env, verify the weekly email fires.)

---

## 14. Admin-Triggered Emails

Verify each of these fires when the corresponding admin action occurs:

| Email | Triggered By |
|-------|-------------|
| **Order Shipped** | First dispatch created for an order (admin clicks Create Dispatch) |
| **Script Review Request** | Researcher clicks Submit for Review on a script → sent to CEO |
| **Script Review Complete (approved)** | CEO clicks Approve → sent to researcher |
| **Script Review Complete (changes requested)** | CEO clicks Request Changes → sent to researcher |
| **Email Template Review Request** | Similar to scripts — sent to CEO |
| **Email Template Review Complete** | Similar to scripts — sent to researcher |
| **Research Outreach** | Admin triggers outreach from a lead card |
| **Research Reminder** | 24-h-before-interview cron (research-reminders) |
| **Research Thank-You** | Post-interview cron (research-followup) |
| **Research Referral Request** | 48-h-post-interview cron (research-referral) |
| **Stale Lead Alert** | Weekly cron (research-stale-leads) |
| **Dispatch Status Emails** | (§16 of client guide) — fired by admin status changes too |

**For each,** check the email arrives, renders correctly, and its links open the right pages.

---

## 15. Admin-Specific State Transitions

### Order
```
PAID ──(admin creates first dispatch)──▶ SHIPPED ──▶ DELIVERED
  │
  └──(admin cancels)──▶ CANCELLED
```

### Script
```
DRAFT ──(submit)──▶ IN_REVIEW ──(approve)──▶ APPROVED ──(archive)──▶ ARCHIVED
                         │
                         └──(request changes)──▶ DRAFT
```

### Interview
```
SCHEDULED ──(start)──▶ IN_PROGRESS ──(complete)──▶ COMPLETED
```

### Lead
```
SOURCED ─▶ CONTACTED ─▶ SCREENED ─▶ SCHEDULED ─▶ COMPLETED ─▶ ANALYSED
                 │                       │
                 ▼                       ▼
             DECLINED                NO_SHOW
```

---

## 16. Edge Cases & Security Checks

Please be adversarial here — admin tooling has more power and therefore more risk.

### Authorization

- A **non-admin user** pasting any `/admin/*` URL must get 403/404 — never data.
- API calls to `/api/v1/admin/*` from a non-admin user must return 401/403 JSON.
- A freshly demoted admin should lose admin access on their next request.
- Session expiry on admin pages should redirect to sign-in cleanly.

### Destructive actions

- Every delete/cancel action must ask for confirmation.
- Once confirmed, can you undo? (Generally no — we soft-delete where possible, but verify.)
- Demoting yourself / the last admin: UI should warn or block.

### Cross-org visibility

- On admin pages (dispatch, cargo, users), you should see **all** organizations.
- Make sure the admin view doesn't accidentally filter to your own org (that's a known bug vector).
- Conversely, the **non-admin** dashboard (`/dashboard`) must still only show your org's data.

### Concurrency

- Two admins creating dispatches on the same order simultaneously — labels shouldn't double-dispatch.
- Two admins reviewing the same script simultaneously — last approve wins is OK, but no data corruption.
- Admin editing a lead while researcher runs an interview on it — notes/scores should merge gracefully.

### Large data

- Pages with 100+ orders / labels / shipments / webhook logs — does pagination work? Is it slow?
- Search with long queries — sanitized against injection.
- Webhook log JSON blobs can be huge — the expand-row view must not hang the browser.

### Time-based

- Manufacturing cooldown: a newly auto-registered label's first 24 h of location events are suppressed. Verify this is visible in the webhook logs (events marked as "suppressed — manufacturing cooldown").
- Dispatch share-link: expires 14 days after creation; day 7 triggers a reminder email.
- Stuck shipment alert: fires after 48 h without location updates (org-configurable).

### Browser & device

- Every admin page should work on a laptop at 1280 px and on a tablet at 768 px. We don't expect admins to use mobile.
- Dark mode should work throughout.
- Tables with many columns should scroll horizontally rather than squash into unreadable columns.

---

## Appendix: Admin Glossary

| Term | Meaning |
|------|---------|
| **Admin role** | A user with `role = 'admin'`. Granted via the `ADMIN_EMAILS` whitelist or another admin's promotion. |
| **Inventory label** | A label that has been registered in the system but not yet sold to a customer. |
| **SOLD label** | A label that has been purchased but is still in TIP's warehouse or in transit to the customer. |
| **ACTIVE label** | A label that has been delivered to the customer and is actively reporting location. |
| **DEPLETED label** | A label whose battery is exhausted — end-of-life. |
| **Dispatch** | An outbound shipment of labels from TIP to a customer/receiver (shipment type = `LABEL_DISPATCH`). |
| **Cargo** | A shipment of the customer's own goods, with a label attached (shipment type = `CARGO_TRACKING`). |
| **Onomondo** | TIP's cellular connectivity provider. Sends webhooks on every location / heartbeat event. |
| **ICCID** | Unique SIM-card identifier. Primary key for cellular events. |
| **IMEI** | Unique device-hardware identifier. Not used for label routing (SIMs move between devices). |
| **Manufacturing cooldown** | 24-h period after a label first reports from the factory; location events are suppressed during this window. |
| **Research Hub** | Internal CRM for running user-research interviews. |
| **Lead** | A research participant candidate (not a sales lead). |
| **Persona** | One of CONSIGNEE, FORWARDER, SHIPPER — used to tag leads and scripts. |
| **Hypothesis signal** | Evidence captured during an interview rated validating / neutral / invalidating a stated hypothesis. |
| **CEO review** | Approval workflow for interview scripts and email templates (DRAFT → IN_REVIEW → APPROVED). |

---

**Thank you for testing the admin side too!** File issues at **https://github.com/TIP-LIVE/hyperlabel-spec/issues** tagged with the section number. If anything here doesn't match what you see in the app, that's a bug too — please tell us.
