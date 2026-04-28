# TIP — Product Implications & Recommended Next Steps (April 2026)

**Schedule 1.B deliverable #6** — What the 8 completed interviews tell us to *do* next.
**Posture:** Recommendations are grouped by horizon (immediate / next quarter / strategic) and tagged with the pain they address from [`2026-04-pain-points.md`](2026-04-pain-points.md).

---

## 1. Immediate — ship-now or fix-now (≤ 4 weeks)

### 1.1 — Reposition: drop sea as a primary use case (ICP marketing)
**Addresses:** P2.3 (sea-mode mismatch).
**Why.** Both Dmytro and Andriy K independently flagged that sea-cargo's 60-day window kills active-tracking attention. The wedge is air + road/auto + truck where the dwell-time alert window is hours-to-days, not weeks-to-months. Current landing copy on tip.live still treats sea, air, and road as equal — needs a hierarchy.
**Action.**
- Rewrite landing copy to lead with *"Door-to-door tracking for international air + multi-modal cargo where every hour of dwell costs money"* (Andrii — landing-page copy is your call as Director).
- Keep sea as a supported-but-secondary use case in the FAQ — battery covers it, accuracy is fine for "knowing which port" — but stop putting it in the headline.
- Flag in the investor pitch deck: ICP narrowed based on field research (this is a *strength* signal for investors, not a weakness).

### 1.2 — Add an end-customer-funded checkout add-on motion ($5/label)
**Addresses:** P1.1 (customer-support load), partial H6 refinement.
**Why.** Volodymyr U's specific use case ($130 AOV Shopify dropshipping with ~150 lost parcels in Q4 and a heavy support-ticket load) doesn't fit the $20/label primary motion but is real. He explicitly said "за 5 баксів точно купляли" — at $5 customers will opt in at checkout. The unit economics work if we sell directly to the cargo owner: $5 retail, ~$3 marginal cost (label + SIM data), $2 gross.
**Action.**
- Build a Shopify app + WooCommerce plugin that adds a "Real-time tracking — $5" upsell at checkout. Customer pays, we ship a label to the merchant, merchant sticks at fulfillment. (Estimate: 1.5 sprints — Andrii to scope after he picks up the codebase.)
- Hold off on $5 SKU sales motion until the Shopify funnel is live; until then, Volodymyr U's segment is "interested, not buying".

### 1.3 — Productise the "label sitting unactivated" trigger
**Addresses:** P1.3 (activation-failure risk).
**Why.** Dmytro's clearest concrete worry about the prepaid SKU motion: labels sit on shelves unused. We already have `Label.manufacturedAt`, `activatedAt` — extend to `expectedShipAt` (set at booking), then trigger a "label X has not been activated; expected ship date was Y" reminder if `activatedAt` is null past `expectedShipAt`.
**Action.**
- Extend the cargo creation form: optional "expected ship date" field.
- Add a daily cron (`unused-label-reminder`) that emails the buyer when a SOLD label hasn't been activated within 48h of expected ship.
- Hook into existing notification stack (`sendUnusedLabelReminder` already exists — just needs the new trigger condition).

### 1.4 — WhatsApp Business as the primary update channel (deliver via API, not chase the cabinet)
**Addresses:** P1.2 (no-cabinet preference).
**Why.** Dmytro was emphatic. Andriy K wanted mobile-first. Volodymyr U already runs his customer ops over WhatsApp/Telegram. The current `/cargo` and `/track/[shareCode]` web views are *correct* but they're not where operators live.
**Action.**
- Spike a WhatsApp Business API integration (Meta Cloud API; ~£50/month for the MVP volume).
- New notification template: "TIP cargo {{name}} dwell alert — stationary at {{location}} for {{hours}}h. View: tip.live/track/{{shareCode}}".
- Triggered by the existing dwell-detection logic (already in `processLocationReport` — same code that does auto-delivery).
- Fallback: SMS via Twilio if WhatsApp opt-in not present.

---

## 2. Next quarter — high-leverage builds (4-12 weeks)

### 2.1 — Rules engine: per-zone dwell thresholds + geofence alerts
**Addresses:** P0.1 (dwell-time accountability), P0.3 (multi-tool stack — replaces the rules-tier of the customer's stack).
**Why.** Iegor wrote the entire roadmap unprompted: "коли ми клієнту пропонуємо одразу інфраструктуру, оце буде вже цікаво. От коли ми можемо налаштувати, ми можемо сказати, що нам потрібні якісь там правила відповідно до переміщень." Dmytro confirmed the threshold he wants ("4h is the right alert window for airport — 2h is jittery"). Andriy K confirmed for customs (12h). This is the layer that turns location data into business value.
**Action.**
- New schema: `TrackingRule` (zone polygon or radius around address; max-dwell-hours; alert recipients).
- UI: drag-on-map zone definition + per-zone dwell threshold; defaults pre-loaded for known airports + customs hubs.
- Alerts via WhatsApp/email when dwell > threshold OR cargo deviates >Xkm from planned route.
- Per-shipment override (a one-shipment rule for irregular routes).

### 2.2 — Route templates with anomaly detection vs historical baseline
**Addresses:** P0.1 (dwell-time accountability).
**Why.** Iegor's exact request: "якщо в мене якісь сталі напрямки для відвантаження, я хочу розділити, наприклад, коли в мене з Шанхаю щось виїжджає в Лос-Анджелес, а щось в мене має плити до Майами. Якщо я розумію, що там була затримка… усі інші доїжджали там за п'ять днів, а цей їде там сім — у мене одразу будуть питання: а що цього разу пішло не так?" Once we have ~3 months of rule-engine data this becomes feasible.
**Action.**
- Schema: `RouteTemplate` (origin → destination pair; mean transit time; std dev; quartiles).
- Auto-populate from completed shipments after 5+ data points per origin-destination pair.
- New shipment auto-tags with the matched template; transit-time anomaly alert fires if observed time exceeds template Q3 + 1.5 IQR.

### 2.3 — Forwarder-bundled motion: return-for-credit at $10 net
**Addresses:** P0.3 (multi-tool stack from forwarder side), pricing motion expansion.
**Why.** Andriy K's specific ask: "Якщо у вас їх більше десяти накопилось, ми компенсували вам би витрати на лейбл. Ретюрн зробити… нові купляю не за 20, а за 10. О, до речі, це гарно." Forwarders absorb $20 per label; if 50% are returned post-delivery, effective cost drops to $10 — viable for high-volume clients (Andriy K mentioned Biosphere with ~500 labels in rotation as a target).
**Action.**
- Postage-paid return packaging in each label SKU.
- Refurbishment workflow: returned labels get battery + SIM check, software reset, re-shipped at $10 cost basis.
- New SKU + pricing tier in the order flow: "Forwarder bulk — $20 list, $10 effective via return credit, MOQ 50 labels".

### 2.4 — Carrier regulatory posture register
**Addresses:** P2.1 (regulatory / X-ray risk).
**Why.** Dmytro's flag is real — some airline ground-handlers, customs warehouses, and X-ray facilities object to active electronics. Without a documented posture per carrier, every pilot opens this conversation cold.
**Action.**
- Build a one-page-per-carrier register: passive RF posture, X-ray policy, customs notes per country/lane.
- Pre-clear the top-10 carriers Andriy K and Dmytro work with before formal pilot.
- Surface in the customer-facing FAQ: "TIP labels are a passive Class 3 cellular device; below transmission thresholds for…" with citations.

---

## 3. Research execution plan for remaining 12 interviews

This addresses the §3.2.A.9 + Schedule 1.B contract requirement (20 minimum; 8 completed; 12 remaining). Recommended distribution to plug the most obvious sample gaps:

| Persona | Done | Target | Gap | Recruit via |
|---|---|---|---|---|
| **CONSIGNEE / cargo owner** | 6 (5 useful) | 12 | +6 | Andriy K's referral list (Biosphere, ATB, Obolon — he offered intros); Dmytro's referrals (UTEC Poland clients); Calendly inbound from LinkedIn outreach |
| **FORWARDER (operational)** | 1 (1 useful) | 5 | +4 | Andriy K's offered referrals (Nova Poshta operations; UK trade-route forwarders); pre-screened on "you personally track cargo day-to-day" |
| **SHIPPER** | 1 (1 useful, async) | 3 | +2 | Anna's offered chocolate-co friend (paid follow-up); LinkedIn cold outreach to high-AOV machinery exporters |

**Cadence.** 4 interviews/week × 3 weeks = 12 interviews completed by **2026-05-19** (4 days post handover cut-over). Each interview = 45 min recorded + 30 min notes synthesis + ResearchHub data entry.

**Quality bar.** Per the Masiuk lesson: pre-screen every referral with "do you personally track or move cargo day-to-day?" before booking. Strategic/BizDev contacts are zero-signal for our hypotheses.

**Deliverable update.** Once 20 interviews complete, this document and [`2026-04-pain-points.md`](2026-04-pain-points.md) get a 2026-05 revision; hypothesis verdicts in `ResearchHypothesis` table get re-evaluated; insights summary gets a new "what changed" section.

---

## 4. Strategic — the bets implied by the data (not committed)

These are *implications*, not commitments. Andrii to decide as Director on which to pursue post-handover.

### 4.1 — TIP as the "physical-location bridge" in the EDI ecosystem
Iegor's insight: today's enterprise stacks have EDI for step-status and trackers for location. The product opportunity is a normalised stream that combines both, mapped to common cargo-management primitives (load → in-transit → port-in → customs → port-out → final-mile → delivered). Sell TIP as "the missing physical-location signal in your EDI feed" — the integration value is higher than the device value.

### 4.2 — Insurance partnership for SMB cargo
Muhammed's signal + Andriy K's $80-tracker-paid-for-itself anecdote both point at insurance underwriting as a ~12-month adjacent product. SMB importers under-insure today because pricing is built for enterprise. A real-time-tracked label could be the input that lets a parametric insurer offer per-shipment cargo cover at SMB-friendly prices. Premium share would dwarf the device margin.

### 4.3 — Distribution via cargo-handling forwarders, not direct sales
Forwarders activate; cargo owners buy. The most efficient go-to-market is to embed TIP into the forwarder's intake flow — forwarder sells a "tracked shipment" SKU to their client and absorbs label provisioning. Andriy K, Dmytro both indicated willingness; the return-credit motion (§2.3) makes the unit economics work. Direct e-commerce sales to consignees is the fallback motion, not the primary one.

---

## Cross-references

- [Insights summary (deliverable #4)](2026-04-insights-summary.md) — overall narrative + hypothesis verdicts
- [Pain points (deliverable #5)](2026-04-pain-points.md) — prioritised list (P0/P1/P2)
- [Target list (deliverable #2)](2026-04-target-list.md) — interview plan + completed/pending leads
- Interview guide / questions (deliverable #1): [`/admin/research/scripts`](https://tip.live/admin/research/scripts) — 3 approved scripts (Consignee / Forwarder / Shipper)
- Anonymised notes / transcripts (deliverable #3): [`/admin/research/interviews`](https://tip.live/admin/research/interviews) + raw `Interviews/transcripts/`

---

**Last updated:** 2026-04-28 by Denys Chumak.
