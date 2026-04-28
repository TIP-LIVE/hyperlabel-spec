/**
 * Snapshot of Research Hub state for handoff/contract evidence.
 * Counts leads, interviews (by status), and lists deliverables.
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

async function main() {
  const leads = await prisma.researchLead.count()
  const leadsByStatus = await prisma.researchLead.groupBy({
    by: ['status'],
    _count: { _all: true },
  })

  const interviews = await prisma.researchInterview.findMany({
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      completedAt: true,
      lead: { select: { name: true, email: true, persona: true, company: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  })

  const hypotheses = await prisma.researchHypothesis.count()
  const scripts = await prisma.researchScript.count()
  const insights = await prisma.researchInsight?.count?.() ?? 0
  const tasks = await prisma.researchTask.count()

  console.log('=== Research Hub snapshot ===\n')
  console.log(`Leads:        ${leads}`)
  for (const r of leadsByStatus) {
    console.log(`  ${r.status.padEnd(15)} ${r._count._all}`)
  }
  console.log(`\nInterviews:   ${interviews.length}`)
  const byStatus: Record<string, number> = {}
  for (const i of interviews) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1
  for (const [s, n] of Object.entries(byStatus)) {
    console.log(`  ${s.padEnd(15)} ${n}`)
  }
  console.log(`\nInterview list (most recent first):`)
  for (const i of interviews) {
    const when = i.completedAt?.toISOString().slice(0, 10) ?? i.scheduledAt?.toISOString().slice(0, 10) ?? '?'
    console.log(`  ${when}  ${i.status.padEnd(15)} ${(i.lead?.persona ?? '').padEnd(10)} ${i.lead?.name ?? ''} (${i.lead?.email ?? ''}) ${i.lead?.company ?? ''}`)
  }
  console.log(`\nHypotheses:   ${hypotheses}`)
  console.log(`Scripts:      ${scripts}`)
  console.log(`Insights:     ${insights}`)
  console.log(`Tasks:        ${tasks}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
