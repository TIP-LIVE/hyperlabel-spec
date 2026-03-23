import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Enable WebSocket support for Node.js (Neon serverless uses WebSockets)
neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Hypotheses from 01-RESEARCH-OBJECTIVES.md ──────────────

const hypotheses = [
  {
    code: 'H1',
    statement:
      'SMB importers lose money because they can\'t see where cargo is in real time',
    successSignal:
      '6+ of 10 report financial impact >$500/incident',
  },
  {
    code: 'H2',
    statement:
      'Existing tracking tools (carrier portals, Excel, WhatsApp) are fragmented and unreliable',
    successSignal:
      'Majority use 3+ tools and rate satisfaction ≤3/5',
  },
  {
    code: 'H3',
    statement:
      'A $20-25 disposable label is an acceptable price point for consignees',
    successSignal:
      '5+ of 10 say "yes" or "probably" at $20-25',
  },
  {
    code: 'H4',
    statement:
      'Forwarders would activate labels on behalf of their clients if the process takes <2 min',
    successSignal:
      '4+ of 6 say the workflow fits their process',
  },
  {
    code: 'H5',
    statement:
      'Cell-tower-level accuracy (city/district) is "good enough" vs GPS precision',
    successSignal:
      'Majority accept city-level for the price',
  },
  {
    code: 'H6',
    statement:
      'The buyer (consignee) — not the shipper — is the right person to purchase',
    successSignal:
      'Clear pattern on purchasing authority',
  },
]

// ── Scripts parsed from interview script markdown files ──────

const consigneeSections = [
  {
    title: 'Introduction',
    duration: 5,
    questions: [
      {
        text: 'Thanks for making time for this. I\'m Denys, working on a new product in the cargo tracking space. This is a research conversation — there are no right or wrong answers, and I genuinely want to hear about your real experience, even if it\'s critical. Everything you share stays confidential. Is it OK if I record this for my notes?',
        probes: [],
      },
      { text: 'Confirm recording consent verbally', probes: [] },
      {
        text: 'To start, could you tell me your name, role, and a bit about what your company does?',
        probes: [],
      },
    ],
  },
  {
    title: 'Background & Context',
    duration: 5,
    questions: [
      { text: 'What\'s your role day-to-day?', probes: ['How long have you been in this role / industry?'] },
      { text: 'What types of goods do you import, and from where?', probes: [] },
      { text: 'Roughly how many international shipments do you handle per month?', probes: ['Is your company growing its import volume, or is it stable?'] },
      { text: 'What transport modes do you use most? (ocean, air, road)', probes: [] },
    ],
  },
  {
    title: 'Current Tracking Workflow',
    duration: 15,
    questions: [
      {
        text: 'Walk me through what happens after you place an order with your supplier.',
        probes: ['Do you have a single dashboard, or do you switch between multiple tools?'],
      },
      { text: 'At what point do you first get a tracking number or shipment reference?', probes: [] },
      {
        text: 'What tools or systems do you use to check where cargo is? (carrier portal, forwarder emails, WhatsApp, spreadsheet, ERP)',
        probes: ['How reliable are the updates you get from your forwarder / carrier?'],
      },
      {
        text: 'How often do you check the status of a shipment in transit?',
        probes: ['How much time per week would you estimate you spend on shipment tracking?'],
      },
      {
        text: 'Who else in your team needs to know where a shipment is?',
        probes: ['Do you pay specifically for any tracking service today? How much?'],
      },
    ],
  },
  {
    title: 'Pain Points & Failures',
    duration: 10,
    questions: [
      { text: 'What\'s your biggest frustration with tracking international shipments?', probes: ['How often does this kind of thing happen — once a month, once a quarter?'] },
      {
        text: 'Can you tell me about a specific time when lack of visibility cost you money or caused a problem?',
        probes: ['What happened?', 'How did you find out?', 'What was the financial impact?', 'What\'s the typical cost when it goes wrong? (penalties, emergency air freight, lost customer)'],
      },
      { text: 'How do your own customers react when you can\'t give them an ETA?', probes: [] },
      {
        text: 'Have you ever had cargo lost, damaged, or significantly delayed where earlier visibility would have made a difference?',
        probes: ['Is there a point in the journey where you feel most "blind"?'],
      },
    ],
  },
  {
    title: 'Solution Exploration',
    duration: 10,
    questions: [
      { text: '[Share screen — show TIP concept: label photo, tracking dashboard mockup, map view]', probes: [] },
      { text: 'What\'s your first reaction?', probes: [] },
      { text: 'Would this solve the problem you described earlier?', probes: ['How would this compare to what your forwarder already provides?'] },
      { text: 'What questions do you have?', probes: [] },
      { text: 'What would be a must-have feature for you?', probes: [] },
      { text: 'What\'s missing that would make this a no-brainer?', probes: [] },
      {
        text: 'The accuracy is city/district level, not street level. Is that useful, or do you need more precision?',
        probes: ['Would you want your customers to see this dashboard too?', 'Would you use this for every shipment, or only high-value ones?'],
      },
    ],
  },
  {
    title: 'Pricing & Purchase Decision',
    duration: 5,
    questions: [
      { text: 'If this existed today, what would you expect to pay per label, per shipment?', probes: [] },
      {
        text: 'Our target price is $20-25 per label. How does that feel?',
        probes: ['Would you rather buy labels individually or in bulk packs?', 'Would a subscription model (monthly fee + cheaper labels) be more attractive?', 'At what shipment value does $20-25 tracking become a no-brainer?'],
      },
      { text: 'Who in your company would approve this purchase?', probes: [] },
      { text: 'Would you expense it per shipment, or would it need a budget line?', probes: [] },
      { text: 'What would prevent you from buying this?', probes: [] },
    ],
  },
  {
    title: 'Wrap-Up',
    duration: 5,
    questions: [
      { text: 'Is there anything I didn\'t ask that you think I should know?', probes: [] },
      { text: 'If we launch a pilot in the next few months, would you be interested in trying it with a real shipment?', probes: [] },
      { text: 'Do you know anyone else — another importer or a forwarder — who might be willing to talk with me?', probes: [] },
      { text: 'Confirm follow-up email address', probes: [] },
      { text: 'Note pilot interest level (1-5)', probes: [] },
    ],
  },
]

const forwarderSections = [
  {
    title: 'Introduction',
    duration: 5,
    questions: [
      {
        text: 'Thanks for taking the time. I\'m Denys, and I\'m building a product that helps cargo buyers track international shipments. I\'m talking to forwarders because you\'re at the centre of the shipment journey. No right or wrong answers — honest feedback is the most valuable thing. Everything stays confidential. OK to record?',
        probes: [],
      },
      { text: 'Confirm recording consent', probes: [] },
      { text: 'Could you tell me your name, role, and a bit about your company?', probes: [] },
    ],
  },
  {
    title: 'Background & Context',
    duration: 5,
    questions: [
      { text: 'What does your day-to-day look like?', probes: ['How many clients do you serve concurrently?'] },
      { text: 'What types of cargo and trade lanes do you handle most?', probes: [] },
      { text: 'Roughly how many shipments per month does your team manage?', probes: ['What\'s your team size for operations?'] },
      { text: 'What\'s the split between ocean, air, and road?', probes: [] },
    ],
  },
  {
    title: 'Current Visibility & Client Communication',
    duration: 15,
    questions: [
      { text: 'How do you track shipments internally? What tools do you use?', probes: ['What percentage of your time goes into status updates vs actual logistics work?'] },
      { text: 'How do you share updates with clients? (email, portal, WhatsApp, phone)', probes: ['Have you ever lost a client because of poor visibility or communication?'] },
      { text: 'How often do clients ask you "where is my shipment?"', probes: [] },
      { text: 'What do you do when you don\'t have an answer?', probes: ['Do you offer any tracking portal or is it manual updates?'] },
      { text: 'Do any of your clients currently use their own tracking devices or labels?', probes: ['Do your carriers give you reliable tracking data?'] },
    ],
  },
  {
    title: 'Pain Points & Problem Scenarios',
    duration: 10,
    questions: [
      { text: 'What\'s the most frustrating part of keeping clients informed?', probes: ['How does poor visibility affect your relationship with clients?'] },
      { text: 'Tell me about a time when a client was upset about lack of visibility. What happened?', probes: [] },
      { text: 'Where in the journey do you have the least visibility?', probes: ['What would change if you could see every shipment on a map in real time?'] },
      { text: 'Do you ever get blamed for delays you couldn\'t see coming?', probes: ['Is there a competitive pressure to offer better tracking?'] },
    ],
  },
  {
    title: 'Activation Workflow & Solution Fit',
    duration: 10,
    questions: [
      { text: '[Share screen — show TIP label, QR scan activation flow, dashboard]', probes: [] },
      { text: 'Who at your end would physically attach and activate the label?', probes: ['What if the client sends you the label and asks you to activate it — is that a hassle or a service you\'d offer?'] },
      { text: 'Could that person do it in under 2 minutes?', probes: [] },
      { text: 'Would this fit into your existing warehouse or pickup workflow?', probes: ['Would you charge clients extra for this, or include it in your service?'] },
      { text: 'Would you want access to the tracking dashboard too, or is this purely for the client?', probes: ['Does city-level accuracy (not street-level) still have value for you?'] },
      { text: 'Would you recommend this to your clients?', probes: ['What would make you NOT want to deal with this?'] },
    ],
  },
  {
    title: 'Business Model & Partnership',
    duration: 5,
    questions: [
      { text: 'If your clients started asking for this, would you want to be the one to sell/provide it?', probes: ['What if TIP offered you a partner portal — bulk label management, client dashboards — would that be attractive?'] },
      { text: 'Would you prefer to resell labels at a markup, or just handle activation as a service?', probes: [] },
      { text: 'Would better tracking help you win new clients?', probes: [] },
      { text: 'How many of your clients do you think would use this?', probes: ['Would you trial this with one client to start?'] },
    ],
  },
  {
    title: 'Wrap-Up',
    duration: 5,
    questions: [
      { text: 'Anything I should know that I didn\'t ask?', probes: [] },
      { text: 'Would you be interested in a pilot — testing this with one real shipment?', probes: [] },
      { text: 'Can you introduce me to any of your clients who might want to talk about their tracking pain?', probes: [] },
      { text: 'Confirm follow-up email and note referrals', probes: [] },
      { text: 'Note pilot interest level (1-5)', probes: [] },
    ],
  },
]

const shipperSections = [
  {
    title: 'Introduction',
    duration: 5,
    questions: [
      {
        text: 'Thanks for your time. I\'m Denys, building a new cargo tracking product. I\'m speaking with logistics professionals to understand the industry perspective. Confidential, no wrong answers. OK to record?',
        probes: [],
      },
      { text: 'Confirm recording consent', probes: [] },
      { text: 'Tell me about your role and what your company does.', probes: [] },
    ],
  },
  {
    title: 'Background',
    duration: 5,
    questions: [
      { text: 'What modes of transport does your company operate? (ocean, air, trucking, multi-modal)', probes: [] },
      { text: 'What types of cargo do you handle?', probes: [] },
      { text: 'How many shipments per month?', probes: [] },
      { text: 'What\'s your geographic coverage?', probes: [] },
    ],
  },
  {
    title: 'Current Tracking Capabilities',
    duration: 15,
    questions: [
      { text: 'What tracking systems do you use internally?', probes: ['How much do you invest in tracking technology per year?'] },
      { text: 'What visibility do you give your clients? (portal, API, manual updates)', probes: ['Have you evaluated any third-party tracking devices?'] },
      { text: 'Do your clients ask for more visibility than you can provide?', probes: [] },
      { text: 'Do you use any IoT devices or tracking hardware on cargo today?', probes: ['What held you back from adopting IoT tracking?'] },
      { text: 'What data do your clients value most? (location, ETA, temperature, proof of delivery)', probes: [] },
    ],
  },
  {
    title: 'Industry Perspective',
    duration: 10,
    questions: [
      { text: 'How is demand for cargo visibility changing in your industry?', probes: ['Would you see this as a threat to your own tracking offering, or complementary?'] },
      { text: 'Are your competitors offering better tracking? What do they do?', probes: [] },
      { text: 'Do you see disposable IoT labels as a realistic product category?', probes: ['Are there trade lanes or cargo types where this would be especially valuable?'] },
      {
        text: 'What concerns would you have about a SIM-based label attached to cargo? (Regulatory? Battery safety? Customs?)',
        probes: ['Any concerns about labels going through X-ray, customs, or extreme environments?'],
      },
      { text: 'Is cell-tower accuracy (city-level) useful in your operations, or do you need GPS precision?', probes: [] },
    ],
  },
  {
    title: 'Solution Reaction',
    duration: 10,
    questions: [
      { text: '[Share screen — TIP concept]', probes: [] },
      { text: 'Initial reaction?', probes: [] },
      { text: 'Would this work operationally on cargo you handle?', probes: ['What if a client showed up with a labeled box — any issues at your end?'] },
      { text: 'What problems do you foresee?', probes: [] },
      { text: 'Would you want to integrate this into your systems, or keep it separate?', probes: [] },
      { text: 'Would you co-sell this with your logistics services?', probes: ['Would you want bulk pricing to offer this to all your clients?'] },
    ],
  },
  {
    title: 'Wrap-Up',
    duration: 5,
    questions: [
      { text: 'What did I miss? What should I be thinking about?', probes: [] },
      { text: 'Would you be open to a pilot — tracking one real shipment?', probes: [] },
      { text: 'Can you connect me with anyone in your network who imports goods and struggles with visibility?', probes: [] },
      { text: 'Note pilot interest (1-5) and partnership potential', probes: [] },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding research hypotheses and scripts...')

  // Upsert hypotheses
  for (const h of hypotheses) {
    await prisma.researchHypothesis.upsert({
      where: { code: h.code },
      update: { statement: h.statement, successSignal: h.successSignal },
      create: h,
    })
    console.log(`  ✅ Hypothesis ${h.code}`)
  }

  // Upsert scripts by checking for existing ones by persona + title
  const scripts = [
    { title: 'Consignee Interview Script v1', persona: 'CONSIGNEE' as const, sections: consigneeSections },
    { title: 'Forwarder Interview Script v1', persona: 'FORWARDER' as const, sections: forwarderSections },
    { title: 'Shipper Interview Script v1', persona: 'SHIPPER' as const, sections: shipperSections },
  ]

  for (const s of scripts) {
    const existing = await prisma.researchScript.findFirst({
      where: { persona: s.persona, title: s.title },
    })

    if (existing) {
      await prisma.researchScript.update({
        where: { id: existing.id },
        data: { sections: s.sections },
      })
      console.log(`  ✅ Updated script: ${s.title}`)
    } else {
      await prisma.researchScript.create({
        data: {
          title: s.title,
          persona: s.persona,
          sections: s.sections,
          status: 'DRAFT',
        },
      })
      console.log(`  ✅ Created script: ${s.title}`)
    }
  }

  console.log('\n✨ Seed complete!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
