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
  const s = await prisma.shipment.findUnique({
    where: { id: process.argv[2] || 'cmohlrt94000004i6n8sut642' },
    select: {
      id: true,
      shareCode: true,
      name: true,
      status: true,
      label: { select: { displayId: true } },
      _count: { select: { locations: true } },
    },
  })
  console.log(JSON.stringify(s, null, 2))
}

main().finally(() => prisma.$disconnect())
