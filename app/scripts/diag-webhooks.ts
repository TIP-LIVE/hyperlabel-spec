/**
 * Diagnostic: dump recent WebhookLog entries for an ICCID, showing the
 * received lat/lng (if any) and event type. Use to verify that what
 * Onomondo sent us matches what we stored as LocationEvents.
 *
 * Usage:
 *   npx tsx scripts/diag-webhooks.ts <iccid> [hours]
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const iccid = process.argv[2]
const hours = parseInt(process.argv[3] ?? '12', 10)
if (!iccid) {
  console.error('Usage: diag-webhooks.ts <iccid> [hours=12]')
  process.exit(1)
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const since = new Date(Date.now() - hours * 3600 * 1000)
  const logs = await prisma.webhookLog.findMany({
    where: { iccid, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  console.log(`Last ${logs.length} webhook(s) for ICCID ${iccid} (past ${hours}h):`)
  for (const log of logs) {
    const body = (log.body as Record<string, unknown>) ?? {}
    const time = body.time as string | undefined
    const type = (body.type as string | undefined) ?? log.eventType ?? '?'
    const loc = body.location as { lat?: unknown; lng?: unknown; cell_id?: unknown; accuracy?: unknown } | undefined
    const network = body.network as { name?: string; country_code?: string } | undefined
    const status = log.statusCode ?? '?'

    let coords = '(no location field)'
    if (loc) {
      const lat = loc.lat
      const lng = loc.lng
      if (lat != null && lng != null) {
        coords = `lat=${lat} lng=${lng} cell=${loc.cell_id ?? '?'} acc=${loc.accuracy ?? '?'}`
      } else {
        coords = '(location field present, lat/lng null)'
      }
    }
    const net = network ? `${network.country_code ?? '?'}/${network.name ?? '?'}` : ''
    console.log(`  ${time ?? log.createdAt.toISOString()} ${type.padEnd(22)} status=${status} ${net.padEnd(20)} ${coords}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
