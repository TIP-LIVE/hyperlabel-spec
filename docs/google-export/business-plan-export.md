# TIP — Business Plan

**Track Any Cargo, Anywhere**

---

## Executive Summary

**TIP** is a disposable smart tracking label that provides reliable cargo visibility every 2 hours for $20-25 per shipment. Unlike traditional trackers costing $70-500, TIP is thin (3.5mm), works in 180+ countries with AI-powered route intelligence, and requires no technical setup—just scan, peel, and stick.

**Market Opportunity:** The global cargo tracking market is valued at $18B (MarketsandMarkets 2024), with a growing segment of small-to-medium businesses underserved by expensive enterprise solutions.

**Business Model:** Direct-to-business label sales with expanding margins at scale (50% → 63% gross margin over 3 years).

**Traction:** Production-ready hardware, live platform, and ready for first customer pilots.

**Funding:** Seeking $500K seed to manufacture initial inventory, acquire first 500+ customers, and reach $440K revenue in Year 1.

---

## 1. The Problem

### 1.1 Cargo Visibility Gap

Businesses shipping high-value goods face three critical challenges:

| Problem | Who Feels It | Impact | Current Solutions Fall Short |
|---------|-------------|--------|------------------------------|
| **"Where is my cargo?"** | Consignee | No visibility into shipment location or condition; anxiety and inability to plan | Traditional trackers lose connectivity; carrier systems only work within their network |
| **Communication breakdown** | Shipper | Updates only every 3-4 days; if something goes wrong, you find out too late | Enterprise solutions require IT integration—overkill for businesses shipping 10-100 items/year |
| **Carbon footprint gap** | Industry / ESG compliance | 60%+ of corporate emissions originate from supply chains; companies cannot measure or report without shipment-level data | No affordable per-shipment carbon tracking for SMBs; ESG requirements growing |

### 1.2 Market Pain Points

**From Customer Discovery Interviews (8 conducted, Dec 2025):**

> "I ship $50K worth of electronics from Shenzhen to London. The forwarder gives me updates every 3-4 days. If something goes wrong, I find out too late."
> — Electronics trader, 15 years experience, ships 30 containers/year

> "We tried Tive, but at $200 per tracker, it only makes sense for shipments over $10K. Most of our orders are $2-5K."
> — Amazon FBA seller, $800K annual GMV

**Quantified Pain (Sourced):**
- **$15-25B** lost annually to cargo theft and delays globally (BSI & TT Club Cargo Theft Report 2023)
- **47%** of supply chain leaders cite real-time visibility as top investment priority (Gartner Supply Chain Survey 2023)
- **68%** of SMB shippers report "limited or no visibility" during international transit (Freightos SMB Survey 2024)

*Full interview transcripts available in data room.*

---

## 2. The Solution

### 2.1 Product Overview

**TIP** is a credit-card-thin smart tracking label that:

- **Costs $20-25** (vs. $70-500 for competitors)
- **Works everywhere** (180+ countries, including flights & ocean)
- **Requires zero setup** (scan QR code, peel, stick, track)
- **Lasts 60+ days** (covers most international shipments)

### 2.2 How It Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. ORDER   │───▶│  2. PEEL &  │───▶│  3. TRACK   │───▶│  4. RECEIVE │
│   LABELS    │    │    STICK    │    │  ANYWHERE   │    │    CARGO    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                   │                  │                   │
     ▼                   ▼                  ▼                   ▼
  Buy online         Activate by        Real-time map      Consignee
  (1-10 packs)       QR scan,          with alerts &      confirms
                     attach label       share link         delivery
```

### 2.3 Key Features

| Feature | Benefit |
|---------|---------|
| **Ultra-thin design** (3.5mm) | Fits on any package without bulk |
| **Global softSIM** (Onomondo) | Works in 180+ countries automatically |
| **Offline storage** | Captures location even without signal, syncs later |
| **Shareable links** | Consignee tracks without account |
| **Delivery confirmation** | Automatic geofence detection |
| **Low battery alerts** | Proactive notifications |

### 2.4 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Hardware** | Custom PCB, LTE Cat-1 modem, GNSS | Designed for manufacturing scale |
| **Connectivity** | Onomondo softSIM | Single SIM, global coverage |
| **Platform** | Next.js, PostgreSQL, Clerk, Stripe | Modern, scalable architecture |
| **Hosting** | Vercel / GCP | Auto-scaling, 99.9% uptime |

---

## 3. Market Analysis

### 3.1 Market Size

| Segment | Size | Methodology | Source |
|---------|------|-------------|--------|
| **TAM** | $18B | Global real-time location systems for logistics | MarketsandMarkets 2024 |
| **SAM** | $1.8B | SMB + mid-market segment (est. 10% of TAM) | Company estimate |
| **SOM (Year 1)** | $440K | 20,000 labels × $22 ASP | Bottom-up from sales targets |
| **SOM (Year 3)** | $5.16M | 200,000 labels × $25.50 ASP | Bottom-up projection |

**SAM Calculation:**
- TAM ($18B) × SMB share (10%) = $1.8B
- SMB share estimated based on: enterprise solutions (Tive, Roambee, Sensitech) dominate ~80% of market; SMB underserved
- Disposable label sub-segment growing faster than overall market

### 3.2 Market Trends

**Tailwinds (Sourced):**

| Trend | Data Point | Source |
|-------|------------|--------|
| softSIM cost reduction | 60-70% cost decline since 2020 | GSMA softSIM Report 2024 |
| LTE Cat-1 coverage | 180+ countries with coverage | Onomondo coverage map |
| Supply chain visibility priority | 47% of leaders cite as top investment | Gartner Supply Chain Survey 2023 |
| Cross-border e-commerce growth | 14.5% YoY growth | Statista 2024 |

**Market Growth Rates:**

| Segment | CAGR | Source |
|---------|------|--------|
| Cargo tracking (overall) | 11.8% | MarketsandMarkets 2024-2030 |
| IoT in logistics | 13.2% | Grand View Research 2024 |
| Disposable trackers | 20-25% (est.) | Emerging segment, limited data |

*Note: Disposable tracker segment is nascent; growth rate estimated based on Reelables growth and softSIM adoption curves.*

### 3.3 Target Customers

**Primary (MVP):**

| Segment | Size | Pain Level | Volume |
|---------|------|------------|--------|
| **Amazon FBA sellers** | 2M+ globally | High | 10-100/month |
| **E-commerce brands** | 100K+ | High | 50-500/month |
| **Art & antiques dealers** | 50K+ | Very High | 5-20/month |
| **Electronics traders** | 200K+ | High | 20-200/month |
| **High value goods** | Large | Very High | 10-100/month |
| **Manufacturing** | Large | High | 50-500/month |
| **Supply chain / logistics** | Large | High | 100-1,000/month |
| **Pharma** | 50K+ | Very High | 50-500/month |
| **Time-sensitive goods** | Large | Very High | 20-200/month |
| **Defence** | Niche | Very High | Custom volumes |

**Secondary (Year 2+):**

| Segment | Opportunity |
|---------|-------------|
| Freight forwarders | White-label / resale partnerships |
| 3PL providers | Integrated solution |
| Enterprise logistics | API integration |

### 3.4 Customer Personas

**Persona 1: "The Importer" (Primary Buyer)**
- E-commerce seller shipping from China to EU/US
- Ships 20-50 packages/month, avg value $3-10K each
- Currently uses carrier tracking (unreliable) or nothing
- Willing to pay $20-30 for peace of mind on high-value items

**Persona 2: "The Forwarder" (Secondary User)**
- Receives label from importer
- Activates and attaches to cargo
- Values simplicity (no app download, no account required)

---

## 4. Competitive Analysis

### 4.1 Competitive Landscape

| Competitor | Type | Price | Target | Weakness vs. TIP |
|------------|------|-------|--------|-------------------------|
| **Tive** | Reusable | $150-300 | Enterprise | Too expensive for SMB |
| **Roambee** | Reusable | $200-400 | Enterprise | Complex setup, long contracts |
| **Sensitech** | Reusable | $300+ | Pharma/cold chain | Niche, very expensive |
| **SODAQ** | Smart label | €50-100 | Mid-market | Higher price, reusable model |
| **Sensos** | Smart label | €30-80 | Mid-market | Similar but higher price |
| **Reelables** | Disposable | $20-30 | SMB | Direct competitor |

### 4.2 Competitive Positioning

```
                    HIGH PRICE
                        │
     Sensitech ●        │        ● Controlant
        $300+           │            $400+
                        │
     Roambee ●          │        ● Tive
        $200            │          $150
                        │
    ────────────────────┼────────────────────
    ENTERPRISE          │           CONSUMER
    (Complex)           │           (Simple)
                        │
     SODAQ ●            │
       €75              │        ★ TIP
                        │            $22
     Sensos ●           │        ● Reelables
       €50              │            $25
                        │
                    LOW PRICE
```

### 4.3 Deep Dive: Reelables (Primary Competitor)

Reelables is our most direct competitor. Here's our honest assessment:

| Dimension | Reelables | TIP | Advantage |
|-----------|-----------|------------|-----------|
| **Price** | $20-30 | $20-25 | TIP (slightly cheaper) |
| **Battery** | 30-45 days | 60+ days | **TIP** |
| **Coverage** | ~100 countries | 180+ countries | **TIP** |
| **Intelligence** | None | AI route detection | **TIP** |
| **Form factor** | Thin | 3.5mm thin | Comparable |
| **Funding** | Seed stage | Seed stage | Comparable |
| **Geography focus** | US domestic | China → EU/US exports | **TIP** (less overlap) |

**Why We Can Win Despite Reelables:**
1. **Geographic focus:** Reelables targets US domestic; we target China export corridor (different customer base)
2. **Battery life:** 60+ days vs 30-45 covers longer international shipments
3. **Coverage:** 180+ countries critical for international; Reelables ~100 countries
4. **AI route intelligence:** Transport-mode detection and route reconstruction — Reelables offers basic GPS only
5. **Founder advantage:** CEO with 12 years in Shenzhen, direct access to shippers and suppliers

**Competitive Response Plan:**
- If Reelables enters China corridor: compete on battery life, coverage, local support
- If Reelables raises significant funding: accelerate enterprise partnerships, consider M&A discussions
- If price war: our COGS roadmap allows margin to compete

### 4.4 Competitive Moat (Honest Assessment)

| Advantage | Description | Defensibility | Timeline |
|-----------|-------------|---------------|----------|
| **Hardware design** | 3.5mm, 60+ day battery | Medium | Patent application filed Jan 2026 |
| **Manufacturing relationships** | CEO with 10+ year Shenzhen supplier ties | High | Takes 3-5 years to replicate |
| **China export network** | Direct access to shipper ecosystem | High | Trust-based, hard to replicate |
| **Unit economics** | $9.50 COGS at 200K scale | Medium | Achievable by any funded competitor |
| **AI route intelligence** | Transport-mode detection, route reconstruction | Medium | Improving continuously |
| **First-mover in niche** | China→EU/US disposable tracking | Low | 12-18 month window |

**What's NOT a Moat:**
- Software platform (replicable)
- Onomondo relationship (available to anyone)
- Brand (not yet established)

*We are building a business on execution speed and founder advantages, not defensible technology.*

---

## 5. Go-to-Market Strategy

### 5.1 Phase 1: Founder-Led Sales (Months 1-6)

**Target:** 500+ customers, 20,000 labels, $440K revenue

| Channel | Tactic | Expected Customers |
|---------|--------|-------------------|
| **Founder network** | Direct outreach to Andrii's contacts | 80-100 |
| **Amazon seller communities** | Reddit, Facebook groups, forums | 100-130 |
| **LinkedIn outreach** | Targeted messaging to e-commerce sellers | 80-100 |
| **Content marketing** | SEO blog posts, YouTube demos | 60-80 |
| **Referrals** | Customer word-of-mouth | 40-60 |

**Key Messages:**
- "Track your $5K shipment for $22, not $200"
- "Know exactly where your cargo is—even on a plane"
- "No app, no contract, no complexity"

### 5.2 Phase 2: Scalable Channels (Months 7-18)

| Channel | Investment | Expected ROI |
|---------|------------|--------------|
| **Google Ads** | $30K | 3-4x |
| **Trade shows** | $15K | Relationship-building |
| **Partnerships** | BD effort | Revenue share |
| **API integrations** | Engineering | Enterprise deals |
| **Cargo platform / freight forwarder SaaS integration** | Engineering + BD | Recurring enterprise revenue |

### 5.3 Pricing Strategy

| Pack | Price | Target Customer |
|------|-------|-----------------|
| **1 Label** | $25 | Trial / occasional |
| **5 Labels** | $110 ($22/ea) | Regular shipper |
| **10 Labels** | $200 ($20/ea) | Volume shipper |
| **Enterprise** | Custom pricing | 100+ labels/month |

**Why This Pricing:**
- $25 single: Low barrier to trial
- $20-22 volume: Competitive with Reelables, 80%+ below Tive/Roambee
- Gross margin remains >60% at volume

### 5.4 Sales Process

```
Awareness → Interest → Trial → Adoption → Expansion
    │          │         │         │          │
 Content    Demo/    1-3 labels   5-10+    Enterprise
  + Ads    Landing    order      packs      deal
            Page
```

**Conversion Targets:**
- Website → Sign-up: 5%
- Sign-up → First order: 30%
- First order → Repeat: 40%

---

## 6. Operations Plan

### 6.1 Supply Chain

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MANUFACTURING  │───▶│   FULFILLMENT   │───▶│    CUSTOMER     │
│   (Shenzhen)    │    │  (UK warehouse) │    │   (Global)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                       │                      │
  Lead time: 60-90d     Ship time: 1-3d         Use time: 60d
  MOQ: 1,000 units      Inventory: 2,000        Support: Email
```

### 6.2 Manufacturing

| Phase | Volume | Lead Time | Cost/Unit |
|-------|--------|-----------|-----------|
| **Pilot** | 1,000 | 90 days | $8.00 |
| **Year 1** | 8,000 | 60 days | $10.00 |
| **Year 2** | 40,000 | 45 days | $9.00 |
| **Year 3** | 120,000 | 30 days | $8.70 |

**Quality Control:**
- 100% functional testing before shipment
- 5% sample inspection for defects
- Warranty reserve: 3% of revenue

### 6.3 Fulfillment

Shipping is charged separately to the customer and is not included in COGS.

| Market | Fulfillment | Ship Time | Cost (charged separately) |
|--------|-------------|-----------|---------------------------|
| **UK/EU** | UK warehouse | 2-5 days | $2.00 |
| **US** | Direct from UK (initially) | 5-10 days | $4.00 |
| **China** | Direct ship | 7-14 days | $3.00 |

**Year 2:** Add US warehouse for faster US delivery

### 6.4 Customer Support

| Tier | Channel | Response Time | Cost |
|------|---------|---------------|------|
| **MVP** | Email | <24 hours | Founders |
| **Year 1** | Email + FAQ | <12 hours | Part-time hire |
| **Year 2** | Chat + Email | <4 hours | 1 FTE |

---

## 7. Financial Summary

### 7.1 Revenue Projections

| Year | Labels Sold | ASP | Revenue | Customers | Gross Margin | Net Income |
|------|-------------|-----|---------|-----------|--------------|------------|
| **2026** | 20,000 | $22 | $440K | 500+ | 50% | $(50K) |
| **2027** | 50,000 | $25 | $1.26M | 2,000 | 61% | $223K |
| **2028** | 200,000 | $25.50 | $5.16M | 8,000 | 63% | $1.85M |

### 7.2 COGS Breakdown (Per Label)

| Component | Year 1 | Year 2 | Year 3 |
|-----------|--------|--------|--------|
| **Hardware** | $10.00 | $9.00 | $8.70 |
| **softSIM** | $0.50 | $0.50 | $0.50 |
| **Assembly & QC** | $0.50 | $0.40 | $0.30 |
| **COGS / label** | **$11.00** | **$9.90** | **$9.50** |

*Note: Shipping is charged separately to the customer and is not included in COGS.*

### 7.3 Path to Profitability

| Milestone | Timeline | Revenue | Status |
|-----------|----------|---------|--------|
| First sale | Q1 2026 | - | ✅ Ready |
| Break-even (monthly) | Q3 2026 | $22K/mo | 🎯 Target |
| Cash flow positive | Q3 2027 | $60K/mo | 🎯 Target |
| Profitable (annual) | 2027 | $1.26M | 🎯 Target |

### 7.4 Funding Requirements

| Round | Amount | Use | Milestone |
|-------|--------|-----|-----------|
| **Seed** | $500K | Manufacturing, GTM | 20K labels, 500+ customers |
| **Series A** | $1-2M | Scale, team, product | 50K labels, $100K MRR |

---

## 8. Team

### 8.1 Founders

**Andrii Tkachuk — CEO & Hardware Lead** (Full-time, London-based)
- **Experience:** 12 years in electronics manufacturing and product development in Shenzhen
- **UTEC (Founded 2018):** Hardware development company, 8 employees, profitable since 2020
- **Track Record:** Led development of 15+ IoT products from prototype to mass production
- **TIP Role:** Hardware design, manufacturing relationships, operations
- **Unique Value:** 10+ year relationships with Shenzhen EMS vendors and component suppliers
- **LinkedIn:** [linkedin.com/in/andrii-tkachuk]

**Denys Chumak — Product & Platform** (Part-time → Full-time post-funding)
- **Experience:** 6 years in product management and software development
- **Previous Role:** Product Lead at fintech startup (B2B SaaS payments platform, scaled to $2M ARR)
- **Technical Skills:** Full-stack development (Next.js, TypeScript, PostgreSQL)
- **TIP Role:** Platform development, business strategy, investor relations, user research
- **Education:** MBA candidate (part-time); CS degree
- **LinkedIn:** [linkedin.com/in/denyschumak]

**Founder Commitment:**
- Andrii: Full-time, 100% dedicated
- Denys: Currently 50% (parallel commitment), transitioning to 100% upon funding close
- Both founders have invested personal capital into prototype development

### 8.2 Core Team

**Anatoliy Standerchuk — Lead Developer**
- Full-stack engineer with deep experience in IoT platforms and real-time data systems
- Responsible for platform architecture, API development, and device communication layer
- Key contributor to TIP's production-ready software stack

### 8.3 Hiring Plan

| Role | Timeline | Salary Range | Focus |
|------|----------|--------------|-------|
| Customer Success | Q2 2026 | $35-45K | Support, onboarding, documentation |
| Sales Lead | Q3 2026 | $50-70K + commission | Outbound, partnerships, enterprise |
| Full-Stack Engineer | Q4 2026 | $60-80K | Platform features, API, mobile prep |
| Marketing Manager | Q1 2027 | $50-65K | Content, SEO, paid acquisition |

*Salary ranges based on UK/EU remote talent market; may adjust for US hires.*

### 8.4 Advisors

| Advisor | Area | Relationship | Contribution |
|---------|------|--------------|--------------|
| Manufacturing Advisor | Manufacturing | Informal (active) | 20+ year Foxconn veteran; supply chain optimization. Name withheld pending formal agreement. |
| Logistics Advisor | Logistics | Informal (active) | Former DHL APAC operations; market introductions. Name withheld pending formal agreement. |
| **Seeking** | B2B SaaS growth | — | GTM playbook, metrics benchmarking |
| **Seeking** | Fundraising | — | Series A preparation, investor introductions |

*Advisor names available under NDA. Formal advisory agreements to be established post-seed close.*

### 8.5 Team Gaps & Mitigation

| Gap | Risk | Mitigation |
|-----|------|------------|
| No dedicated sales hire Y1 | Slower customer acquisition | Founder-led sales; hire Q3 if traction exceeds plan |
| Denys part-time initially | Platform development slower | MVP live and production-ready; priority features scoped for post-funding sprint. Transitioning to full-time upon seed close. |
| No US presence | US market entry slower | UK warehouse first; US warehouse Year 2 |

---

## 9. Risk Analysis

### 9.1 Key Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Hardware defects** | Medium | High | QA processes, warranty reserve, batch testing |
| **Slow adoption** | Medium | High | Pilot programs, case studies, referral incentives |
| **Competitor entry** | Medium | Medium | Speed to market, customer relationships, IP |
| **Supply chain** | Low | High | Multiple suppliers, inventory buffer |
| **Connectivity issues** | Low | Medium | Multi-carrier softSIM, offline storage |

### 9.2 Regulatory Considerations

| Area | Status | Notes |
|------|--------|-------|
| CE marking (EU) | Required | Standard process |
| FCC (US) | Required | Onomondo handles |
| GDPR | Required | Privacy-by-design |
| Export controls | N/A | Consumer electronics |

---

## 10. Milestones & Metrics

### 10.1 12-Month Milestones

| Quarter | Milestone | Success Metric |
|---------|-----------|----------------|
| **Q1 2026** | MVP launch | Platform live, first 50 customers |
| **Q2 2026** | Traction | 150 customers, 8,000 labels sold |
| **Q3 2026** | Growth | 300 customers, break-even monthly |
| **Q4 2026** | Scale prep | 500+ customers, Series A process |

### 10.2 Key Performance Indicators

| KPI | Q1 Target | Q4 Target |
|-----|-----------|-----------|
| Labels sold (cumulative) | 2,000 | 20,000 |
| Active customers | 50 | 500+ |
| Monthly revenue | $15K | $50K |
| CAC | <$150 | <$100 |
| NPS | 30+ | 40+ |
| Platform uptime | 99.5% | 99.5% |

---

## 11. The Ask

### 11.1 Funding Request

**Raising:** $500,000 Seed Round

**Terms:** Convertible note or SAFE, standard seed terms

**Pre-money valuation:** $2.5-4M

### 11.2 Use of Funds

| Category | Amount | % | Purpose |
|----------|--------|---|---------|
| **Sales & Marketing** | $200,000 | 40% | Customer acquisition, trade shows, content |
| **Manufacturing** | $150,000 | 30% | 8,000+ labels (2 production batches) |
| **Engineering** | $100,000 | 20% | Platform scale, mobile app |
| **Operations** | $50,000 | 10% | Legal, insurance, admin |

### 11.3 Investor Value-Add

Most valuable beyond capital:
1. **Logistics industry connections** — Introductions to freight forwarders, 3PLs
2. **B2B SaaS expertise** — GTM playbook, metrics guidance
3. **Manufacturing experience** — Supply chain optimization

---

## Appendix

### A. Product Screenshots

**Live Platform:** [tip.live](https://tip.live) — contact denys@tip.live for a guided demo

Key screens available:
- Dashboard with active shipment overview
- Real-time tracking map with route history
- Public tracking page (shareable link, no login required)
- Label purchase flow (Stripe checkout)
- Admin panel for inventory and order management

### B. Customer Testimonials

*To be added after pilot customers complete first shipments (expected Q1-Q2 2026).*

### C. Technical Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS | Web platform |
| **Backend** | Next.js API Routes, Prisma ORM | Server logic, data access |
| **Database** | PostgreSQL | Shipments, locations, users, orders |
| **Auth** | Clerk | User management, SSO |
| **Payments** | Stripe | Checkout, webhooks |
| **Maps** | Google Maps API | Route visualization |
| **Email** | Resend + React Email | Transactional notifications |
| **Hosting** | Vercel | Auto-scaling, edge CDN |
| **Device Comms** | REST API (TLS) | Label → server location reports |

### D. Full Financial Model

See [FINANCIAL-MODEL.md](FINANCIAL-MODEL.md) for complete 3-year projections including monthly targets, sensitivity analysis, and break-even analysis.

### E. Marketing Budget

| Category | Year 1 | Year 2 | Year 3 |
|----------|--------|--------|--------|
| **Total Marketing** | $100K | $120K | $200K |
| Trade shows | $10K | $25K | $50K (25% of marketing) |
| Digital ads | $40K | $50K | $70K |
| Content & SEO | $30K | $25K | $40K |
| Other | $20K | $20K | $40K |

### F. Engineering Headcount

| Year | FTEs | Focus |
|------|------|-------|
| **Year 1** | 1 FTE | Platform MVP, device integration |
| **Year 2** | 2 FTE | Mobile app, API, enterprise features |
| **Year 3** | 3-4 FTE | Scale, analytics, integrations |

---

**Contact:**

Andrii Tkachuk — av@tip.live
Denys Chumak — denys@tip.live

**Website:** tip.live

---

*Last Updated: February 2026*
