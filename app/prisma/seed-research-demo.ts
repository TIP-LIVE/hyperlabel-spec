import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

// Enable WebSocket support for Node.js (Neon serverless uses WebSockets)
neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Demo Leads ──────────────────────────────────────────────

const demoLeads = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@importdirect.co.uk',
    company: 'ImportDirect Ltd',
    role: 'Operations Manager',
    persona: 'CONSIGNEE' as const,
    status: 'ANALYSED' as const,
    source: 'linkedin',
    pilotInterest: 5,
    giftCardSent: true,
    giftCardType: 'amazon-30-gbp',
  },
  {
    name: 'Marcus Webb',
    email: 'marcus@globalgoods.com',
    company: 'Global Goods Co',
    role: 'Procurement Director',
    persona: 'CONSIGNEE' as const,
    status: 'COMPLETED' as const,
    source: 'referral',
    pilotInterest: 4,
    giftCardSent: false,
  },
  {
    name: 'Elena Petrova',
    email: 'elena@swiftfreight.eu',
    company: 'Swift Freight Solutions',
    role: 'Account Manager',
    persona: 'FORWARDER' as const,
    status: 'SCHEDULED' as const,
    source: 'cold-email',
    pilotInterest: null,
  },
  {
    name: 'James Okafor',
    email: 'james.okafor@tidelogistics.com',
    company: 'Tide Logistics',
    role: 'Managing Director',
    persona: 'SHIPPER' as const,
    status: 'CONTACTED' as const,
    source: 'personal-network',
    pilotInterest: null,
    // This lead has been in CONTACTED for 10 days — should trigger stale warning
  },
  {
    name: 'Priya Sharma',
    email: 'priya@craftimports.co.uk',
    company: 'Craft Imports',
    role: 'Founder',
    persona: 'CONSIGNEE' as const,
    status: 'SOURCED' as const,
    source: 'linkedin',
    pilotInterest: null,
  },
]

// ── Demo Interviews (for COMPLETED + ANALYSED leads) ────────

function buildInterviews(leadIds: { sarah: string; marcus: string; elena: string }) {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  return [
    // Sarah Chen — completed 5 days ago, fully analysed
    {
      leadId: leadIds.sarah,
      scheduledAt: new Date(now - 6 * dayMs),
      completedAt: new Date(now - 5 * dayMs),
      duration: 52,
      status: 'COMPLETED' as const,
      notes: {
        'Introduction': 'Very open and engaged. Has 8 years in operations. Company imports consumer electronics from Shenzhen.',
        'Background & Context': 'Handles ~40 shipments/month, mostly ocean freight from China. Growing 20% YoY. Uses a mix of ocean and air.',
        'Current Tracking Workflow': 'Uses carrier portals (Maersk, CMA CGM), forwarder WhatsApp updates, and a shared Google Sheet. Checks status 2-3x daily. Spends ~5 hours/week on tracking. Team of 3 needs visibility.',
        'Pain Points & Failures': 'Biggest frustration: 2-3 day gaps between carrier updates during transshipment. Lost £12k last quarter when delayed container missed a retail launch. Customers get angry when no ETA available.',
        'Solution Exploration': 'Very positive reaction. "This would have saved us from the Felixstowe disaster." City-level accuracy is fine — they just need to know which country/port. Must-have: alerts when shipment stops moving.',
        'Pricing & Purchase Decision': 'Expected £15-20. £20-25 feels reasonable for high-value shipments (>£5k). Would buy in bulk packs of 20. She can approve up to £500 without sign-off.',
        'Wrap-Up': 'Very interested in pilot. Offered to connect us with her forwarder at Swift Freight.',
      },
      keyQuotes: [
        { quote: 'I spend more time chasing tracking updates than actually managing shipments', context: 'Discussing daily workflow', theme: 'time-waste' },
        { quote: 'We lost a £12,000 retail launch because the container sat in Colombo for 3 days and nobody told us', context: 'Describing worst tracking failure', theme: 'financial-impact' },
        { quote: 'City-level is absolutely fine — I just need to know it left Shanghai and is heading to Felixstowe', context: 'Reacting to accuracy level', theme: 'accuracy-acceptance' },
        { quote: 'If this was £20 and I could stick it on every container, I would do it tomorrow', context: 'Pricing reaction', theme: 'price-validation' },
      ],
      hypothesisSignals: [
        { hypothesisId: 'H1', signal: 'validating', evidence: 'Lost £12k due to invisible delay in Colombo. Reports financial impact multiple times per year.' },
        { hypothesisId: 'H2', signal: 'validating', evidence: 'Uses 4 tools (carrier portals, WhatsApp, Google Sheets, email). Rates satisfaction 2/5.' },
        { hypothesisId: 'H3', signal: 'validating', evidence: 'Said £20-25 is reasonable. Would buy bulk packs. "I would do it tomorrow."' },
        { hypothesisId: 'H5', signal: 'validating', evidence: 'City-level is "absolutely fine" — just needs country/port-level visibility.' },
        { hypothesisId: 'H6', signal: 'validating', evidence: 'She (consignee) has purchasing authority up to £500. Would expense per shipment.' },
      ],
    },
    // Marcus Webb — completed 2 days ago
    {
      leadId: leadIds.marcus,
      scheduledAt: new Date(now - 3 * dayMs),
      completedAt: new Date(now - 2 * dayMs),
      duration: 45,
      status: 'COMPLETED' as const,
      notes: {
        'Introduction': 'Friendly but time-conscious. Runs procurement for a mid-size consumer goods importer.',
        'Background & Context': '25 shipments/month from China and Vietnam. Mix of ocean (80%) and air (20%). Company has been importing for 15 years.',
        'Current Tracking Workflow': 'Relies heavily on forwarder emails. Has a basic ERP with shipment module but says it is always out of date. Checks manually once a day.',
        'Pain Points & Failures': 'Main pain: customs delays are invisible until the forwarder calls. Had a £8k emergency airfreight bill last month because ocean shipment was stuck and they only found out 5 days late.',
        'Solution Exploration': 'Interested but cautious. Wants to see it work on a real shipment before committing. Concerned about label surviving container conditions.',
        'Pricing & Purchase Decision': 'Expected £10-15. Said £20-25 is on the high side but acceptable for critical shipments over £10k value.',
        'Wrap-Up': 'Would trial with 5 labels on next batch. Moderate pilot interest.',
      },
      keyQuotes: [
        { quote: 'My forwarder only tells me about delays after the damage is done', context: 'Discussing visibility gaps', theme: 'communication-lag' },
        { quote: 'We paid £8,000 for emergency airfreight because nobody noticed the container was stuck', context: 'Recent financial impact', theme: 'financial-impact' },
        { quote: 'I need to see it survive a container from Hai Phong to Southampton before I believe it works', context: 'Product skepticism', theme: 'proof-needed' },
      ],
      hypothesisSignals: [
        { hypothesisId: 'H1', signal: 'validating', evidence: '£8k emergency airfreight cost from invisible delay. Reports this happens ~quarterly.' },
        { hypothesisId: 'H2', signal: 'validating', evidence: 'Uses forwarder emails + outdated ERP. Rates satisfaction 2/5. Manual daily checks.' },
        { hypothesisId: 'H3', signal: 'neutral', evidence: 'Said £20-25 is "on the high side" but acceptable for critical shipments >£10k.' },
        { hypothesisId: 'H5', signal: 'validating', evidence: 'Didn\'t raise accuracy concerns. Focused on knowing "is it moving or stuck?"' },
        { hypothesisId: 'H6', signal: 'validating', evidence: 'Procurement director would make the purchase. Budget holder for logistics spend.' },
      ],
    },
    // Elena Petrova — scheduled for tomorrow (upcoming)
    {
      leadId: leadIds.elena,
      scheduledAt: new Date(now + 1 * dayMs),
      completedAt: null,
      duration: 60,
      status: 'SCHEDULED' as const,
      notes: null,
      keyQuotes: null,
      hypothesisSignals: null,
    },
  ]
}

// ── Demo Tasks ──────────────────────────────────────────────

function buildTasks(leadIds: { marcus: string; sarah: string }) {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  return [
    {
      title: 'Send gift card to Marcus Webb',
      category: 'GIFT_CARD' as const,
      status: 'TODO' as const,
      leadId: leadIds.marcus,
      dueDate: new Date(now + 1 * dayMs),
    },
    {
      title: 'Write interview summary for Sarah Chen',
      category: 'ANALYSIS' as const,
      status: 'IN_PROGRESS' as const,
      leadId: leadIds.sarah,
      dueDate: new Date(now - 1 * dayMs),
    },
    {
      title: 'Send gift card to Sarah Chen',
      category: 'GIFT_CARD' as const,
      status: 'DONE' as const,
      leadId: leadIds.sarah,
      dueDate: new Date(now - 4 * dayMs),
    },
  ]
}

async function main() {
  console.log('🌱 Seeding research demo data...\n')

  // ── Upsert leads ──────────────────────────────────────
  const leadMap: Record<string, string> = {}

  for (const lead of demoLeads) {
    const existing = await prisma.researchLead.findFirst({
      where: { name: lead.name, email: lead.email },
    })

    if (existing) {
      await prisma.researchLead.update({
        where: { id: existing.id },
        data: lead,
      })
      leadMap[lead.name] = existing.id
      console.log(`  ✅ Updated lead: ${lead.name} (${lead.status})`)
    } else {
      const created = await prisma.researchLead.create({ data: lead })
      leadMap[lead.name] = created.id
      console.log(`  ✅ Created lead: ${lead.name} (${lead.status})`)
    }
  }

  // Make James Okafor look stale (CONTACTED 10 days ago)
  await prisma.researchLead.update({
    where: { id: leadMap['James Okafor'] },
    data: { updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  })
  console.log('  ⏳ Made James Okafor stale (CONTACTED 10 days ago)')

  // ── Set script statuses ──────────────────────────────
  const consigneeScript = await prisma.researchScript.findFirst({
    where: { persona: 'CONSIGNEE' },
  })
  if (consigneeScript && consigneeScript.status !== 'APPROVED') {
    await prisma.researchScript.update({
      where: { id: consigneeScript.id },
      data: {
        status: 'APPROVED',
        reviewedBy: 'andrii',
        reviewNotes: 'Great questions — approved. Consider adding a follow-up about ERP integration in section 3.',
        reviewedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    })
    console.log('\n  ✅ Consignee script → APPROVED')
  }

  const forwarderScript = await prisma.researchScript.findFirst({
    where: { persona: 'FORWARDER' },
  })
  if (forwarderScript && forwarderScript.status !== 'IN_REVIEW') {
    await prisma.researchScript.update({
      where: { id: forwarderScript.id },
      data: { status: 'IN_REVIEW' },
    })
    console.log('  ✅ Forwarder script → IN_REVIEW')
  }

  // ── Create interviews ─────────────────────────────────
  console.log('')
  const interviews = buildInterviews({
    sarah: leadMap['Sarah Chen'],
    marcus: leadMap['Marcus Webb'],
    elena: leadMap['Elena Petrova'],
  })

  for (const interview of interviews) {
    // Check if interview already exists for this lead + scheduled time
    const existing = await prisma.researchInterview.findFirst({
      where: { leadId: interview.leadId, scheduledAt: interview.scheduledAt },
    })

    if (existing) {
      await prisma.researchInterview.update({
        where: { id: existing.id },
        data: interview,
      })
      console.log(`  ✅ Updated interview for lead ${interview.leadId}`)
    } else {
      await prisma.researchInterview.create({ data: interview })
      console.log(`  ✅ Created interview (${interview.status})`)
    }
  }

  // ── Create tasks ──────────────────────────────────────
  console.log('')
  const tasks = buildTasks({
    marcus: leadMap['Marcus Webb'],
    sarah: leadMap['Sarah Chen'],
  })

  for (const task of tasks) {
    const existing = await prisma.researchTask.findFirst({
      where: { title: task.title, leadId: task.leadId },
    })

    if (existing) {
      await prisma.researchTask.update({
        where: { id: existing.id },
        data: task,
      })
      console.log(`  ✅ Updated task: ${task.title}`)
    } else {
      await prisma.researchTask.create({ data: task })
      console.log(`  ✅ Created task: ${task.title} (${task.status})`)
    }
  }

  console.log('\n✨ Research demo data seeded!')
  console.log(`   ${demoLeads.length} leads, ${interviews.length} interviews, ${tasks.length} tasks`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
