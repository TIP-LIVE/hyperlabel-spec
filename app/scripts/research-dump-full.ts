/**
 * Dump full interview content (notes + quotes + signals) so we can
 * synthesise insights summary, pain points, product implications.
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
    out += `Source: ${i.lead?.source ?? '-'}  Pilot interest: ${i.lead?.pilotInterest ?? '-'}/5\n`
    out += `Completed: ${i.completedAt?.toISOString().slice(0, 10)}  Lead status: ${i.lead?.status}\n`
    out += `${'='.repeat(80)}\n\n`
    out += `### NOTES\n${JSON.stringify(i.notes, null, 2)}\n\n`
    out += `### KEY QUOTES\n${JSON.stringify(i.keyQuotes, null, 2)}\n\n`
    out += `### HYPOTHESIS SIGNALS\n${JSON.stringify(i.hypothesisSignals, null, 2)}\n`
  }

  writeFileSync('/tmp/interviews-full.txt', out)
  console.log(`Wrote ${out.length} bytes to /tmp/interviews-full.txt`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
