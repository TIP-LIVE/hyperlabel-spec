/**
 * Compact dump: notes-by-section + quotes + signals (no verbatim transcripts).
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import { writeFileSync } from 'fs'
// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
})

function trim(s: string | undefined, max = 1500) {
  if (!s) return ''
  // Strip the long verbatim transcript blocks marked by ## ПОВНИЙ
  const idx = s.indexOf('## ПОВНИЙ')
  if (idx > 0) s = s.slice(0, idx).trim()
  return s.length > max ? s.slice(0, max) + ' …[truncated]' : s
}

async function main() {
  const interviews = await prisma.researchInterview.findMany({
    where: { status: 'COMPLETED' },
    include: { lead: true },
    orderBy: { completedAt: 'desc' },
  })

  let out = ''
  for (const i of interviews) {
    out += `\n${'='.repeat(80)}\n`
    out += `${i.lead?.name} (${i.lead?.persona}) — ${i.lead?.company ?? ''}\n`
    out += `Source: ${i.lead?.source ?? '-'}  Pilot: ${i.lead?.pilotInterest ?? '-'}/5  Completed: ${i.completedAt?.toISOString().slice(0, 10)}\n`
    out += `${'='.repeat(80)}\n\n`

    const notes = (i.notes ?? {}) as Record<string, string>
    for (const section of ['Background & Context', 'Current Tracking Workflow', 'Pain Points & Failures', 'Solution Exploration', 'Pricing & Purchase Decision', 'Wrap-Up']) {
      if (notes[section]) {
        out += `### ${section}\n${trim(notes[section])}\n\n`
      }
    }

    const quotes = (i.keyQuotes as Array<{quote:string;theme:string;context:string}> | null) ?? []
    out += `### KEY QUOTES (${quotes.length})\n`
    for (const q of quotes) out += `- [${q.theme}] "${q.quote}"\n`
    out += '\n'

    const signals = (i.hypothesisSignals as Array<{hypothesisId:string;signal:string;evidence:string}> | null) ?? []
    out += `### HYPOTHESIS SIGNALS (${signals.length})\n`
    for (const s of signals) out += `- ${s.hypothesisId}=${s.signal}: ${s.evidence}\n`
  }

  writeFileSync('/tmp/interviews-summary.txt', out)
  console.log(`Wrote ${out.length} bytes`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
