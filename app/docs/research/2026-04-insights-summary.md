# TIP — User Research Insights Summary (April 2026)

**Schedule 1.B deliverable #4** — Insights summary across the 8 completed user interviews.
**Live source:** [`/admin/research/insights`](https://tip.live/admin/research/insights) — page auto-aggregates the same data structured below.
**Anonymisation:** Per §13.1(d) of the consultancy agreement, full names are kept here only because they are part of the agreed Schedule 1.B target-list deliverable; downstream insights documents (e.g. investor decks) should refer to people by persona + role.

---

## TL;DR — what we now know

1. **The wedge is international air + multi-modal cargo for importer/exporter consignees**, not domestic parcels and not small-AOV e-commerce. Domestic parcel networks already work; small-AOV ecom can't justify the price.
2. **The pain is dwell, not loss.** "Cargo sat 14 days at one step with no visibility" is what triggers tracking budget — not "cargo went missing". Every chronic-delay experience reported in the interview set was measured in operational hours and customer-support load, not lost goods.
3. **Today's stack is multi-tool by default.** Carrier portal + EDI step messages + WhatsApp + a separate tracker contract is a normal configuration. The unique value TIP can deliver is *consolidating physical location + step status into one channel the operator already lives in* (WhatsApp, mobile push, email digest).
4. **The buyer is the cargo owner.** Forwarders facilitate; importers/exporters fund. Two open exceptions: high-volume forwarders may bundle TIP into their service (Andriy K wants a return-for-credit program), and low-AOV e-commerce can flip the buyer to the end customer via a checkout add-on (Volodymyr U).
5. **Single-shot price of $20 is correct for the ICP** but doesn't cover all motions. We need three pricing motions: list ($20-25 for high-AOV cargo), consolidated ($20/pallet ≈ cents/parcel), end-customer add-on ($5 at checkout for $130-AOV ecom).

---

## Sample composition

| Persona | Count | Notes |
|---|---|---|
| **CONSIGNEE** | 6 of 8 | 5 useful + 1 disqualified (Daniil — wrong consignee profile) |
| **FORWARDER** | 1 of 8 | Andriy K (Nippon Express). Masiuk (Nova Poshta BizDev) was a screening miss — strategic role, not operational |
| **SHIPPER** | 1 of 8 | Anna Lebid (Dow Benelux) — async + her referred friend at a Belgian chocolate company |
| **TOTAL useful** | **7 of 8** | Daniil disqualified post-call |

**Total interviews recorded against contract minimum:** 8 / 20 (40%). Remaining 12 are addressed in [Product Implications & Next Steps](2026-04-product-implications.md) §3.

---

## Hypothesis verdicts (live in `ResearchHypothesis` table)

| # | Statement | V/N/I | Verdict |
|---|---|---|---|
| **H1** | SMB importers lose money because they can't see where cargo is in real time | 4/3/0 | **PARTIALLY VALIDATED** — quantified for international forwarder/consignee ops (Dmytro: $3-4k/mo loss/damage on $100k book; Andriy K: $80 tracker caught driver lying about customs). Not universal — domestic parcel and low-AOV ecom don't feel it. |
| **H2** | Existing tracking tools are fragmented and unreliable | 4/2/1 | **VALIDATED FOR ICP** — international cargo runs EDI + tracker + portal + WhatsApp stacks (Dmytro signed per-country DHL contracts to isolate lost legs; Andriy K: large clients build their own Power BI dashboards). Invalidating signal scoped to domestic parcel scan-tracking. |
| **H3** | $20-25 disposable label is acceptable | 3/2/2 | **PARTIALLY VALIDATED** — works for high-AOV / consolidated cargo (Andriy K: "значно дешевше" vs $80/$150 trackers; Muhammed: "20 USD is a good price"). Fails for low-AOV per-parcel (Volodymyr U: $5 ceiling on $130 AOV). Pricing must segment. |
| **H4** | Forwarders activate labels on behalf of clients if <2 min | 1/2/0 | **NEEDS MORE DATA** — only one true forwarder (Andriy K) interviewed; he said yes, especially with return-credit. Verdict deferred until 2-3 more operational-forwarder interviews. |
| **H5** | Cell-tower accuracy is "good enough" | 2/4/1 | **CONDITIONALLY VALIDATED** — 500m-10km is fine for cargo-tracking use case. Inadequate for high-value parcel last-mile (wants 2m) and intra-Europe air (2h cadence > flight time). Document the limitation, don't mis-target. |
| **H6** | Consignee — not shipper — is the buyer | 4/2/1 | **VALIDATED** — Anna, Iegor, Andriy K, Muhammed all directly confirmed cargo-owner-pays for international cargo. Adjacent finding: end-customer-pays via checkout add-on for low-AOV ecom is a separate motion, not a refutation. |

---

## Persona summaries

### CONSIGNEE (importers/exporters) — primary buyer

**5 useful interviews:** Iegor, Volodymyr U, Dmytro, Andriy K, Muhammed.

**Core pattern.** Consignees fall into two camps: those who already absorb dwell as cost-of-doing-business (Volodymyr U, Muhammed, current-scale UTEC clients) and those whose business model depends on tight dwell control and who actively pay for visibility (Dmytro at scale, Andriy K's Japanese-government cargo clients). The first camp is *not* a customer until they hit chronic delay or a goodwill-bonus event; the second is the wedge.

**Pricing.** $20-25 is correct for the wedge. Below the wedge ($130 AOV ecom) requires a $5 end-customer add-on. Forwarder-facilitated bulk requires a return-for-credit motion ($10 net per re-used label).

**What they actually want.** A rules engine on top of location data — not raw lat/lng. Iegor sketched the full roadmap unprompted: per-zone dwell thresholds (airport: 4h, customs: 12h), geofencing alerts when cargo deviates, route templates for batched shipments with anomaly detection vs historical baseline, configurable map UI with grouping. Andriy K and Dmytro both echoed this — "товар не має лежати; якщо він тільки десь лежить довго — у мене дуже велике питання до логістичної компанії, чого?" The location signal is the input; the operational alert is the product.

**Channel preference.** Don't make them log into a TIP cabinet. Push into their existing channel — WhatsApp Business (Dmytro's call: huge in Mexico + EU, safer than email, more trusted than SMS, less noisy than Telegram), or chatbot + deep-link (InPost-style mini-tracking page).

### FORWARDER — facilitator, sometimes funder

**1 useful interview:** Andriy K (Nippon Express, Ukrainian Desk, Warsaw).

**Insight.** Forwarders are activation partners, not primary buyers. Andriy K activated $80 single-use trackers himself for Japanese clients on demand — would happily do the same with TIP at $20 if there's a return-for-credit motion to keep effective per-use cost near $10. Forwarders won't fund this from their own P&L; it's billable to the client.

**Caveat.** Masiuk (Nova Poshta BizDev) was a screening miss — strategic/product role, not operational. Lesson logged in [target-list document](2026-04-target-list.md) §3: pre-screen referrals on "do you personally track cargo day-to-day" before booking.

### SHIPPER — partner-of-partner blackbox is the wedge

**1 useful interview:** Anna Lebid (Dow Benelux, Road Logistics Coordinator, Rotterdam) + her referred friend at a Belgian chocolate company (async WhatsApp).

**Insight.** Large shippers like Dow have already paid for proprietary visibility on contracted carriers — that layer is solved. The pain is the partner-of-partner blackbox: when the contracted carrier subcontracts a rush job, the partner is off Dow's system and Anna's team eats the operational cost ("ми витрачаємо час на встановлення ETA і ланцюг комунікації продовжуються"). Driver shortage in UK and EU amplifies this — empty trailers waiting for drivers force more rush subcontracts. A portable per-shipment tracker is the only thing that closes this gap because the partner-of-partner driver isn't in any system, but a label stuck on the box doesn't care who's pulling the trailer.

**Pricing segmentation.** Anna's chocolate-co friend articulated the cleanest pricing line in the entire interview set: "a bit expensive for small items" but "for big machinery, 20 euro is peanuts." TIP's ICP within shippers is multi-modal expensive parts / oversize machinery — not standard parcel cargo.

---

## Cross-cutting themes (top quotes per theme)

These themes are the basis for the prioritised pain-points list in [`2026-04-pain-points.md`](2026-04-pain-points.md).

| Theme | Persona spread | Representative quote |
|---|---|---|
| **partner-of-partner blackbox** | SHIPPER + FORWARDER | "ці партнери не підʼєднанні до нашої системи і тоді їх неможливі затрекати" — Anna |
| **dwell-time accountability** | all 3 personas | "товар не має лежати… у мене дуже велике питання до логістичної компанії, чого?" — Andriy K |
| **measured-when-chronic** | CONSIGNEE | "якщо це постійні затримки, вони починають це міряти" — Iegor |
| **carrier portal silo** | CONSIGNEE + FORWARDER | "DHL country franchises cannot query each other's systems" — Dmytro paraphrased |
| **no-cabinet preference** | CONSIGNEE | "Я не буду заходити в чужий кабінет, у вас… загнати під капот, в WhatsApp" — Dmytro |
| **rules-engine ask** | CONSIGNEE | "Коли ми клієнту пропонуємо одразу інфраструктуру, оце буде вже цікаво" — Iegor |
| **support-load reduction** | CONSIGNEE | "У нас є інші питання, чому мій товар 14 днів на одній точці… це навантаження на підтримку" — Volodymyr U |
| **pricing-by-cargo-value** | all 3 personas | "for big machinery 20 euro is peanuts" / "за 5 баксів точно купляли" — Anna's friend / Volodymyr U |
| **activation-failure risk** | CONSIGNEE + FORWARDER | "не забудь нагадати, не забудь наклеїти" — Dmytro |
| **regulatory/sensor risk** | CONSIGNEE + FORWARDER | "Багато компаній використовує X-Ray… можуть бути проти, щоб у них в приміщеннях чи літаках щось буде" — Dmytro |

---

## Pilot-interest signal

| Lead | Pilot interest (1-5) | Disposition |
|---|---|---|
| Dmytro Vergun (UTEC Poland CEO) | 5/5 | "Я точно буду клієнтам, коли запустити, тут в Варшаві буду пробувати робити" — strongest pilot partner |
| Muhammed Mashkoor | 5/5 | "As we grow we will need this" — future pilot when his volume scales |
| Andriy Kolpakov (Nippon Express) | 4/5 | Wants product link, will circulate; offered to refer Nova Poshta operations + UTEC Poland |
| Iegor Glushchenko | 3/5 | Expert-network value > direct purchase; offered ERP/EDI integration help |
| Anna Lebid + chocolate-co friend | 2/5 | Anna soft door open for future coffee chat; friend interested for high-value cargo |
| Volodymyr Ugrinovskiy | 2/5 | Not at his AOV; gave competitor lead (Chinese tracking service) |
| Volodymyr Masiuk | 1/5 | Wrong audience — BizDev not operations |

**Aggregate average pilot interest: 3.3/5**, weighted heavily by the two 5/5 commitments from Dmytro (UTEC Poland) and Muhammed.

---

## Methodology notes (for §13.1 / §13.2 compliance)

- **Recruitment:** LinkedIn cold outreach (1), Calendly inbound (1), referrals (3), personal network (3).
- **Interview format:** 30-45 min Zoom (6 sessions), async LinkedIn DM + WhatsApp screenshots (1 — Anna), async screening (1 — Daniil).
- **Recordings:** stored in `/Users/denyschumak/Documents/HyperLabel/Interviews/` as .mp4; transcripts (Whisper large-v3-turbo, uk) in `Interviews/transcripts/`.
- **Data captured per interview:** structured notes by section (Background, Current Workflow, Pain Points, Solution, Pricing, Wrap-Up), key quotes tagged by theme, hypothesis signals (validating/neutral/invalidating with evidence).
- **GDPR posture:** interviewees informed responses may be used to improve the product (§13.2). Names retained only for the Schedule 1.B target list deliverable; downstream insights cite by persona+role.
- **Compensation:** $50 Amazon voucher per the interview-incentive line item; tracked in `ResearchTask` (category=GIFT_CARD).

---

**Last updated:** 2026-04-28 by Denys Chumak.
**Cross-references:**
- [Pain points (deliverable #5)](2026-04-pain-points.md)
- [Product implications + next steps (deliverable #6)](2026-04-product-implications.md)
- [Target list (deliverable #2)](2026-04-target-list.md)
- Interview guide / questions (deliverable #1): [`/admin/research/scripts`](https://tip.live/admin/research/scripts)
- Anonymised notes/transcripts (deliverable #3): [`/admin/research/interviews`](https://tip.live/admin/research/interviews) + `Interviews/transcripts/`
