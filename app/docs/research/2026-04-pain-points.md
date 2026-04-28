# TIP — Prioritised User Pain Points (April 2026)

**Schedule 1.B deliverable #5** — Prioritised needs / pain points from 7 useful interviews (1 disqualified).
**Method:** Frequency × severity × ICP-fit. Frequency = how many of the 7 useful interviewees raised the theme spontaneously. Severity = the operational/financial cost they articulated. ICP-fit = how well the pain maps to TIP's wedge segment (international air + multi-modal cargo for importer/exporter consignees).
**Live source:** [`/admin/research/insights`](https://tip.live/admin/research/insights) — pain-points panel auto-aggregates from `keyQuotes.theme` counts.

---

## P0 — Existential pains (high frequency × high severity × strong ICP-fit)

### P0.1 · Dwell-time accountability gap
**Who feels it:** Dmytro (CONSIGNEE/UTEC Poland), Andriy K (FORWARDER/Nippon), Iegor (CONSIGNEE/consultant), Anna (SHIPPER/Dow). 4 of 7.
**The pain.** Cargo sits — at customs, at airport ground handling, in a partner warehouse, in a sorter — and nobody knows it's sitting until the client calls to ask. Operators eat the cost three ways: (a) goodwill bonuses to the client when ETA misses, (b) operational hours chasing the ETA up the comms chain, (c) loss of margin lever — once the client knows you knew about the dwell and didn't proactively warn them, they trust the next forwarder more.
**Quantified.** Dmytro: on a $100k/month logistics book, loss/damage/goodwill bonuses run 3-4% = $3-4k/month, drivable to 2% with better visibility. Believes ~70% of lost parcels are recoverable if caught early — the passport anecdote (six Ukrainian passports mis-routed to Szczecin, found via DHL warehouse CCTV). Andriy K's $80 single-use tracker caught a driver lying about an 8-hour customs delay (actual: 2h customs + 6h parked 300m away).
**Why it matters for TIP.** This is the *only* pain that combines (a) measurable financial impact, (b) clear ICP fit, (c) directly addressable by physical-location data with dwell-threshold alerts.

**Representative quotes:**
- "Товар не має лежати. Якщо він тільки десь лежить довго — у мене дуже велике питання до логістичної компанії, чого?" — Andriy K
- "Як правило, я працюю з компаніями, які заказують цей груз. В більшості випадків компанії не міряють, якщо це не має якийсь там сталий характер. Якщо це постійні затримки, вони починають це міряти." — Iegor
- "Якраз от 4 години такий добрий проміжок, де воно може поміняти статус і попасти в літак. Дві години — нема сенсу." — Dmytro

### P0.2 · Partner-of-partner blackbox
**Who feels it:** Anna Lebid (SHIPPER/Dow Benelux), implicitly confirmed by Andriy K (FORWARDER) and Dmytro (CONSIGNEE — DHL franchise pain). 3 of 7.
**The pain.** When a contracted carrier subcontracts a rush job to a partner that isn't on the shipper's tracking system, the visibility chain collapses. Comms stretches: shipper → contracted carrier → partner → driver, each handoff adding latency and ETA error. Driver shortage in UK and EU forces this pattern more often (more empty trailers waiting for drivers means more rush subcontracts). Equivalent pain on the forwarder side: DHL Europe routes through country-local franchises that *cannot query each other's systems* — a parcel Poland→Spain takes 8-14 days with zero visibility because no single DHL portal sees the full chain.
**Why it matters for TIP.** This is the pain that proprietary shipper systems and carrier portals *fundamentally cannot solve* — by definition the partner network is fragmented. A per-shipment portable tracker is the only architecture that closes it because the label doesn't care who's pulling the trailer. This is the single strongest "why TIP exists" articulation we've heard from a shipper.

**Representative quotes:**
- "Найпоширеніша проблема, це те, що всі перевізники працюють з партнерами… ці партнери не підʼєднанні до нашої системи і тоді їх неможливі затрекати. У цьому випадку ми витрачаємо час на встановлення ETA і ланцюг комунікації продовжуються." — Anna
- "Ця проблема перенеслась і у Європу… якщо акредитований перевізник для якогось rushУ просить когось зі своїх партнерів взяти замовлення." — Anna
- "За кордонами одне DHL не дзвонить іншому DHL. Кожна країна — це інша компанія." — Dmytro paraphrased

### P0.3 · Multi-tool stack consolidation
**Who feels it:** Iegor (CONSIGNEE), Dmytro (CONSIGNEE), Andriy K (FORWARDER). 3 of 7.
**The pain.** International cargo workflows run *three or more parallel feeds* per shipment: EDI step messages (load, port-in, port-out, destination, unload) + a separate tracker-company contract for physical location + the carrier's own portal + WhatsApp/email + sometimes a custom Power BI dashboard. Step status and physical location live in different systems and operators stitch them together by hand. Iegor explicitly: "Step-based tooling shows green/red status per leg with per-step tolerance windows but does NOT show physical container location — that is the gap." Andriy K: large clients (ATB, Biosphere, Obolon — 100 containers in flight) build their own dashboards because no off-the-shelf product unifies the feeds.
**Why it matters for TIP.** The integration layer is harder to build than the device. Andriy K previously paid for 6-month custom API integrations per carrier — expensive, brittle, still left holes. TIP's per-shipment label sidesteps the integration problem entirely: one channel for one shipment, irrespective of who's carrying it.

**Representative quotes:**
- "Коли ми клієнту пропонуємо одразу інфраструктуру, оце буде вже цікаво. От коли ми можемо відслідкувати, ми можемо налаштувати, ми можемо сказати, що нам потрібні якісь там правила відповідно до переміщень." — Iegor
- "Великі клієнти роблять свої Power BI дашборди з різних джерел." — Andriy K paraphrased
- "Ви відсвітковуєте — а далі що? Який edit value? Інфраструктура — це і є продукт." — Iegor paraphrased

---

## P1 — Important pains (medium frequency or severity, ICP-relevant)

### P1.1 · Customer-support load from "where is my parcel" tickets
**Who feels it:** Volodymyr U (CONSIGNEE/ecom). 1 of 7 explicit, but applies to anyone running a customer-facing brand.
**The pain.** "Чому мій товар 14 днів на одній точці знаходиться?" — once the supplier-provided tracking link goes silent for 7-14 days during the China→destination sea/air leg, the customer-support inbox fills up. Each ticket costs ~5-15 min of agent time + erodes trust. Volodymyr U told us a Chinese supplier "fixed" the visible tracking by faking that the parcel had already arrived in the destination country — he found this clever; we read it as a tell that customer panic in the dark phase is a real, monetisable pain.
**Why it matters for TIP.** Maps cleanly to the end-customer-funded checkout add-on motion at $5/label. Different pricing motion, same product.

### P1.2 · No-cabinet preference (channel fit)
**Who feels it:** Dmytro (CONSIGNEE), implicitly Andriy K (mobile-first request) and Volodymyr U (Telegram alerts in dropshipping flow). 3 of 7.
**The pain.** Operators won't log into yet another dashboard. Dmytro was emphatic — "Я не буду заходити в чужий кабінет, у вас… загнати під капот, в WhatsApp". The product needs to push into the channel they already check (WhatsApp Business in EU + Mexico + LATAM, mobile push, Telegram for the Ukrainian/Polish operator audience), with a deep-link to a private read-only landing page when they want detail. "Cabinet + login + password — це ж треба за все пам'ять тримати… Загнати під капот комунікацію з цим сервісом, щоб не вимагало мого часу."
**Why it matters for TIP.** This is a *distribution* problem, not a feature gap. The current `/admin` UI is fine as a control plane for ops, but the *value* delivery channel needs to be WhatsApp / mobile push / chatbot-deep-link.

### P1.3 · Activation-failure risk (the prepaid-SKU trap)
**Who feels it:** Dmytro (CONSIGNEE) explicit, Andriy K (FORWARDER) implicit. 2 of 7.
**The pain.** A label SKU sitting on a shelf that nobody remembers to physically stick + activate is dead inventory. Dmytro: "Якщо вони не будуть користуватися — сказати, нафіга він нам потрібен. Треба якийсь тригер запрацювати: не забудь нагадати, не забудь наклеїти." Without an activation reminder fired at the booking-creation step, the prepaid model has a quiet death.
**Why it matters for TIP.** This is a productisation gap, addressable in software: a "label paired with cargo but not activated within X hours of expected ship date" trigger that sends a reminder. The hardware is fine — the workflow scaffolding is missing.

### P1.4 · Accuracy mismatch for high-value parcel last-mile
**Who feels it:** Masiuk (FORWARDER/Nova Poshta — though out of ICP), partially Andriy K (wants 300m). 2 of 7.
**The pain.** Cell-tower 500m fix is fine for cargo (knowing the parcel is "in Gdansk port" is enough to call the broker). It's *not* fine for valuable goods where the customer wants to physically locate the box if it's lost — Masiuk wanted 2m precision. 2-hour cadence is also too slow for intra-Europe air ("за 2 години це там вже майже пів Європи можна пролетіти").
**Why it matters for TIP.** A discipline issue, not a product gap — *don't sell into the high-value parcel last-mile use case until/unless we add a GPS hardware option*. Document the limitation in marketing copy + onboarding so we don't oversell.

---

## P2 — Adjacent / future pains (low frequency or out-of-ICP)

### P2.1 · Regulatory / sensor risk in ground-handling and X-ray facilities
**Who feels it:** Dmytro flagged it explicitly. 1 of 7.
**The pain.** Some airline ground-handlers, customs warehouses and X-ray lanes object to active electronics inside their facilities. Could block deployment for specific cargo paths until carrier-by-carrier confirmation.
**Why it matters for TIP.** Need to verify regulatory posture with carriers before a formal pilot. Document the issue with each carrier's compliance team during pre-pilot conversation. Not a product change — an operational-risk register item.

### P2.2 · Insurance bundle interest
**Who feels it:** Muhammed (CONSIGNEE/noodle-machine importer). 1 of 7.
**The pain.** "If you can do tracking plus insurance — as we grow we will use insurance." Currently pays £35 for 200 units. Sees tracking as an enabler for cargo insurance underwriting rather than a standalone product.
**Why it matters for TIP.** Insurance partnership is a Series-A motion, not a current-quarter motion. Note for the investor-facing pitch deck (Schedule 1.A.5).

### P2.3 · Sea / 60-day-attention-span mismatch
**Who feels it:** Dmytro and Andriy K both flagged. 2 of 7.
**The pain.** "Клієнт собі в голові похоронив на 60 днів думати про цей контейнер" — sea cargo's 60-day window is too long for active tracking attention. Customers buffer the wait mentally and don't engage with daily location updates.
**Why it matters for TIP.** Reposition marketing away from sea-cargo as a primary use case. Air + road/auto + truck (1-30 day windows) is where dwell-time alerts matter. Sea remains technically supported (battery covers it) but isn't the wedge.

---

## Frequency × persona heatmap

| Pain | CONSIGNEE (5) | FORWARDER (1) | SHIPPER (1) | Severity | ICP fit |
|---|---|---|---|---|---|
| Dwell-time accountability | 4 | 1 | 1 | High | High |
| Partner-of-partner blackbox | 1 (Dmytro DHL) | implicit | 1 (Anna) | High | High |
| Multi-tool stack | 3 | 1 | 0 | Medium | High |
| Customer-support load | 1 (Volodymyr U) | 0 | 0 | Medium | Medium (ecom) |
| No-cabinet preference | 3 | 1 | 0 | Medium | High |
| Activation-failure risk | 1 (Dmytro) | 1 (Andriy K) | 0 | Medium | High |
| Accuracy for high-value | 0 | 1 (Andriy K) | 0 | Low | Low (out of ICP) |
| Regulatory / X-ray | 1 (Dmytro) | 0 | 0 | Low | Medium |
| Insurance bundle | 1 (Muhammed) | 0 | 0 | Low | Low (future) |
| Sea-mode mismatch | 1 (Dmytro) | 1 (Andriy K) | 0 | Low | High (positioning) |

---

## What this list is *not*

- **Not a product roadmap.** Roadmap implications are in [`2026-04-product-implications.md`](2026-04-product-implications.md).
- **Not exhaustive.** Based on 7 useful interviews; will be revised after 12 more interviews to hit the contract minimum of 20 (see [Product Implications §3](2026-04-product-implications.md#3-research-execution-plan-for-remaining-12-interviews)).
- **Not a customer list.** Pilot interest is summarised in the [Insights Summary](2026-04-insights-summary.md#pilot-interest-signal); pilot conversion is tracked in `ResearchLead.pilotInterest`.

---

**Last updated:** 2026-04-28 by Denys Chumak.
