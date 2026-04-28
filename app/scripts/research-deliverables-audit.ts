/**
 * Audit each ResearchInterview's keyQuotes / hypothesisSignals / notes to see
 * which feed the auto-aggregated Insights page (= deliverables 4/5/6).
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
})

interface KeyQuote { quote: string; context?: string; theme?: string }
interface HypothesisSignal { hypothesisId: string; signal: string; evidence?: string }

async function main() {
  const interviews = await prisma.researchInterview.findMany({
    where: { status: 'COMPLETED' },
    include: { lead: { select: { name: true, persona: true, company: true, pilotInterest: true } } },
    orderBy: { completedAt: 'desc' },
  })

  console.log(`=== ${interviews.length} completed interviews — content audit ===\n`)
  for (const i of interviews) {
    const quotes = (i.keyQuotes as KeyQuote[] | null) ?? []
    const signals = (i.hypothesisSignals as HypothesisSignal[] | null) ?? []
    const hasNotes = i.notes !== null && i.notes !== undefined
    const notesSize = hasNotes ? JSON.stringify(i.notes).length : 0
    console.log(
      `${(i.lead?.name ?? '?').padEnd(28)} ${(i.lead?.persona ?? '').padEnd(10)} pilot=${i.lead?.pilotInterest ?? '-'}  quotes=${String(quotes.length).padStart(2)} signals=${String(signals.length).padStart(2)} notes=${notesSize}b  ${i.lead?.company ?? ''}`,
    )
  }

  console.log('\n=== Hypotheses ===')
  const hyp = await prisma.researchHypothesis.findMany({ orderBy: { code: 'asc' } })
  for (const h of hyp) {
    console.log(`  ${h.code}  V=${h.validating} N=${h.neutral} I=${h.invalidating}  verdict=${h.verdict ?? '-'}`)
    console.log(`         "${h.statement}"`)
    console.log(`         success: ${h.successSignal}`)
  }

  console.log('\n=== Sample interview content (most recent) ===')
  const recent = interviews[0]
  if (recent) {
    console.log(`Lead: ${recent.lead?.name} (${recent.lead?.persona})`)
    console.log('Notes:', JSON.stringify(recent.notes, null, 2)?.slice(0, 1500) || '(empty)')
    console.log('\nKeyQuotes:', JSON.stringify(recent.keyQuotes, null, 2)?.slice(0, 1500) || '(empty)')
    console.log('\nHypothesisSignals:', JSON.stringify(recent.hypothesisSignals, null, 2)?.slice(0, 1500) || '(empty)')
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
