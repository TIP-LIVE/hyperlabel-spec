# TIP — Interview Plan & Target List (April 2026)

**Schedule 1.B deliverable #2** — Interview plan + agreed target list, snapshot 2026-04-28.
**Live source:** [`/admin/research/leads`](https://tip.live/admin/research/leads) — Kanban view of all leads by status.
**Per §3.2.A.9:** "Conduct a minimum of 20 interviews with potential users (list to be agreed separately)." This document is the target-list snapshot at the end of the Initial Term; the proposed extension list for the remaining 12 interviews is in [§3 of Product Implications](2026-04-product-implications.md#3-research-execution-plan-for-remaining-12-interviews).

---

## 1. Interview plan (high-level)

### 1.1 Personas under study (3)

Per the seed data in `app/prisma/seed-research-scripts.ts` and the approved interview scripts at [`/admin/research/scripts`](https://tip.live/admin/research/scripts):

| Persona | Definition | Why we interview them |
|---|---|---|
| **CONSIGNEE** | Importer / exporter / cargo owner who books logistics | Hypothesised primary buyer (H6); feels dwell-time pain (H1) |
| **FORWARDER** | Logistics operator / forwarding company | Activation gateway (H4); operates the carrier portals we're consolidating (H2) |
| **SHIPPER** | Manufacturer / wholesaler shipping outbound | Buyer of last resort + partner-of-partner blackbox witness |

### 1.2 Interview structure

- 30-45 min recorded video call (Zoom + Google Calendar) OR async LinkedIn DM / WhatsApp where the lead prefers (e.g. Anna Lebid).
- Approved script per persona — 6 sections (Background, Current Workflow, Pain Points, Solution Demo + Reaction, Pricing, Wrap-Up + Referrals).
- Scripts exist in `/admin/research/scripts` with status `APPROVED` (DRAFT → IN_REVIEW → APPROVED workflow per CLAUDE.md).
- Notes captured live in `/admin/research/interviews/[id]` two-pane runner (script left, structured notes right). Auto-saves every 30s.
- Post-call: structured notes tagged by section, key quotes tagged by theme, hypothesis signals tagged validating/neutral/invalidating per H1-H6.
- Compensation: $50 Amazon voucher per the §5.6 expense allowance, tracked in `ResearchTask` (category=GIFT_CARD).

### 1.3 Hypotheses being tested (6)

Same 6 hypotheses are present in `ResearchHypothesis` table with verdicts as of 2026-04-28 — see [Insights Summary](2026-04-insights-summary.md#hypothesis-verdicts-live-in-researchhypothesis-table).

| Code | Statement | Success signal | Status (2026-04-28) |
|---|---|---|---|
| H1 | SMB importers lose money because they can't see where cargo is in real time | 6+ of 10 report financial impact >$500/incident | PARTIALLY VALIDATED |
| H2 | Existing tools fragmented & unreliable | Majority use 3+ tools, satisfaction ≤3/5 | VALIDATED FOR ICP |
| H3 | $20-25 disposable label is acceptable | 5+ of 10 say "yes" / "probably" | PARTIALLY VALIDATED |
| H4 | Forwarders activate labels if <2 min | 4+ of 6 say workflow fits | NEEDS MORE DATA |
| H5 | Cell-tower accuracy is "good enough" | Majority accept city-level | CONDITIONALLY VALIDATED |
| H6 | Consignee is the buyer, not shipper | Clear pattern on purchasing authority | VALIDATED |

---

## 2. Target list — leads as of 2026-04-28

Pulled live from `ResearchLead` table.

### 2.1 Completed interviews (8)

| # | Date | Persona | Lead | Company / Role | Source | Pilot | Status |
|---|---|---|---|---|---|---|---|
| 1 | 2026-03-30 | CONSIGNEE | Muhammed Mashkoor | Noodle-machine importer; ~250 units/mo to US/EU/CA | personal-network | **5/5** | COMPLETED |
| 2 | 2026-04-01 | CONSIGNEE | Volodymyr Ugrinovskiy | Football-footwear ecom (UA + Shopify dropshipping) | personal-network | 2/5 | COMPLETED |
| 3 | 2026-04-01 | CONSIGNEE | Andriy Kolpakov | Nippon Express (Poland) — Ukrainian Desk lead | personal-network | 4/5 | COMPLETED |
| 4 | 2026-04-01 | CONSIGNEE | Dmytro Vergun | UTEC Poland CEO (incoming) | referral — Andriy Kolpakov | **5/5** | COMPLETED |
| 5 | 2026-04-15 | CONSIGNEE | Данііл Ковальчук | Out-of-persona (disqualified post-call) | (unspecified) | — | COMPLETED |
| 6 | 2026-04-21 | FORWARDER | Volodymyr Masiuk | Nova Poshta — Business Development | referral — Andriy Kolpakov | 1/5 | COMPLETED (screening miss; see §3.1) |
| 7 | 2026-04-22 | CONSIGNEE | Iegor Glushchenko | Independent supply-chain optimisation consultant | calendly-inbound | 3/5 | COMPLETED |
| 8 | 2026-04-25 | SHIPPER | Anna Lebid (+ referred friend) | Dow Benelux — Road Logistics Coordinator + Belgian chocolate-co contact (anonymous) | linkedin-cold-outreach | 2/5 | COMPLETED |

**Counts:** CONSIGNEE 6 (5 useful + 1 disqualified) · FORWARDER 1 · SHIPPER 1 + her referred friend (treated as part of #8 since she fronted the response). 7 useful of 8 conducted.

### 2.2 Sourced (in pipeline, not yet interviewed)

| # | Persona | Lead | Status | Notes |
|---|---|---|---|---|
| 9 | CONSIGNEE | Богдан Жилюк | SOURCED | Referred via personal network; outreach sent — awaiting reply |

### 2.3 Pending referrals offered but not yet sourced

| Source | Offered referral | Domain | Status |
|---|---|---|---|
| Andriy Kolpakov (#3) | Nova Poshta operations + R&D leads | FORWARDER | To follow up — Andriy K offered |
| Andriy Kolpakov (#3) | Biosphere supply-chain lead (~500 containers in flight) | CONSIGNEE | High-value referral, still pending intro request |
| Andriy Kolpakov (#3) | Obolon supply-chain | CONSIGNEE | Pending intro request |
| Andriy Kolpakov (#3) | ATB supply-chain | CONSIGNEE | Pending intro request |
| Dmytro Vergun (#4) | UTEC Poland clients (post-relaunch) | CONSIGNEE | Conditional on UTEC Poland relaunch; ~3-week lead time |
| Dmytro Vergun (#4) | Nova Poshta SEO + R&D leaders (ex-colleagues) | FORWARDER | Pending intro request |
| Iegor Glushchenko (#7) | Cargo-handling contacts from his consulting client list | CONSIGNEE | "Will think about it"; soft commitment |
| Anna Lebid (#8) | Belgian chocolate-co friend (already replied async; can introduce for live call) | SHIPPER | Active door — friend gave detailed pricing + use-case feedback already; live call would deepen H3 evidence |

---

## 3. Sourcing channels — what worked, what didn't

### 3.1 What worked

- **Personal network referrals (3 of 8 useful interviews):** highest-quality signal. Dmytro (5/5 pilot), Andriy K (4/5 pilot), Volodymyr U (gave a useful competitor lead despite being out of ICP).
- **Calendly inbound from LinkedIn outreach (1 of 8):** Iegor self-served onto the calendar after a content post — high-intent, deeply technical, prescribed half the product roadmap unprompted.
- **LinkedIn cold + async DM (1 of 8):** Anna Lebid initially declined the call but engaged async over LinkedIn DM and forwarded WhatsApp screenshots from her referred friend. Yielded the cleanest pricing-by-cargo-value segmentation signal in the entire interview set.
- **Cross-persona referral chain (3 of 8 useful):** Andriy K → Volodymyr Masiuk + Dmytro Vergun. The Dmytro one was extraordinary; the Masiuk one was a screening miss (see below).

### 3.2 What didn't work

- **Unscreened referrals (1 of 8):** Volodymyr Masiuk was offered as a Nova Poshta intro by Andriy K, but his actual role is BizDev / strategic / product — not operational logistics. The interview gave us "Nova Poshta is satisfied with scan-tracking" which is a true but irrelevant signal for our ICP. **Lesson:** every referral now goes through a 1-question pre-screen — *"do you personally track or move cargo day-to-day?"* — before booking.
- **Out-of-persona consignees (1 of 8):** Daniil Kovalchuk was a CONSIGNEE on paper but not the importer/exporter profile we're targeting. Interview was disqualified post-call. **Lesson:** screening question added — *"do you ship to / receive from outside your home country?"*

### 3.3 Channels we have not yet used

- **Respondent.io paid recruitment** — budget is approved per §5.6 (within £2,300 services/tools cap). Worth piloting for the FORWARDER persona where personal network is thin.
- **Trade-show / WCAUC outreach** — Andriy K mentioned attending CILT events; could attend or reach out cold to attendee lists.
- **r/freight, r/logistics, /r/Shopify subreddits** — not yet tested; useful for low-AOV ecom segment (Volodymyr U adjacency).

---

## 4. Recommended target list for the remaining 12 interviews

Per [§3 of Product Implications](2026-04-product-implications.md#3-research-execution-plan-for-remaining-12-interviews):

| Persona | Done | Target | Gap | Priority recruit pools |
|---|---|---|---|---|
| **CONSIGNEE** | 6 (5 useful) | 12 | +6 | Andriy K's Biosphere/ATB/Obolon referrals; Dmytro's UTEC Poland clients (post-relaunch); Calendly inbound from LinkedIn outreach |
| **FORWARDER** (operational) | 1 useful | 5 | +4 | Andriy K's Nova Poshta operations + R&D leads (with pre-screen!); UK-based forwarders via LinkedIn cold outreach (e.g. road-freight ops at JCS, BIFA members); Respondent.io |
| **SHIPPER** | 1 (1 useful) | 3 | +2 | Anna's chocolate-co friend (live call); LinkedIn cold outreach to high-AOV machinery exporters; Respondent.io |

**Cadence:** 4 interviews/week × 3 weeks = 12 interviews completed by **2026-05-19**, 4 days post-cut-over. Gives Andrii a clean handover with the Schedule 1.B contract minimum met.

---

## 5. Anonymisation posture (per §13.1.d)

Names + companies appear in this document because §3.2.A.9 + Schedule 1.B explicitly require *"interview plan and agreed target list"* as a deliverable — anonymising defeats the deliverable's purpose.

For all *downstream* deliverables (insights summary, pain points, product implications, investor-facing materials):
- Direct identifiers are dropped or replaced with persona+role descriptors (e.g. "the forwarder at a Japanese trading-house's Polish office" instead of "Andriy Kolpakov at Nippon Express").
- Direct quotes are kept when they carry the analytical weight (an attributed quote from a senior CEO at UTEC Poland carries different weight than an anonymous "logistician") — these are flagged in the doc with a "(consent: standard interview consent)" footnote.
- Recordings remain on the consultant's local machine + the agreed shared workspace; not redistributed beyond the Client per §10.1.
- Any future external sharing (investor deck, press, conference talk) requires Andrii's written consent per §13.2.

---

**Last updated:** 2026-04-28 by Denys Chumak.
