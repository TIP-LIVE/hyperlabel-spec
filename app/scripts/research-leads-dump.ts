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
  const leads = await prisma.researchLead.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    include: { interviews: { select: { completedAt: true, status: true } } },
  })
  for (const l of leads) {
    const completedAt = l.interviews[0]?.completedAt?.toISOString().slice(0,10) ?? '-'
    console.log(`${l.persona.padEnd(10)} ${l.status.padEnd(12)} pilot=${l.pilotInterest ?? '-'} src=${(l.source ?? '-').padEnd(28)} ${l.name} | ${l.company ?? ''} | ${l.email ?? ''} | completed=${completedAt}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
