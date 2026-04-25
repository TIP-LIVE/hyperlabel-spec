/**
 * Diagnostic: dump a label's recent state — last 20 LocationEvents (with
 * geocoded fields), shipment status, and label.lastSeenAt. Use to investigate
 * "app shows wrong city" reports without speculating.
 *
 * Usage:
 *   npx tsx scripts/diag-label.ts <number-or-iccid-or-imei>
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: diag-label.ts <number-or-iccid-or-imei>')
  process.exit(1)
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const label = await prisma.label.findFirst({
    where: {
      OR: [{ displayId: arg }, { deviceId: arg }, { iccid: arg }, { imei: arg }],
    },
  })
  if (!label) {
    console.error('No label matched.')
    return
  }
  console.log('Label:')
  console.log(`  displayId=${label.displayId} deviceId=${label.deviceId} status=${label.status}`)
  console.log(`  iccid=${label.iccid} imei=${label.imei}`)
  console.log(`  lastLat=${label.lastLatitude} lastLng=${label.lastLongitude}`)
  console.log(`  lastSeenAt=${label.lastSeenAt?.toISOString()}`)
  console.log(`  manufacturedAt=${label.manufacturedAt?.toISOString()} activatedAt=${label.activatedAt?.toISOString()}`)

  const shipment = await prisma.shipment.findFirst({
    where: { labelId: label.id, status: { in: ['PENDING', 'IN_TRANSIT'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (shipment) {
    console.log(`\nActive shipment: id=${shipment.id} status=${shipment.status} type=${shipment.type}`)
  } else {
    console.log('\nNo active shipment.')
  }

  const events = await prisma.locationEvent.findMany({
    where: { labelId: label.id },
    orderBy: { recordedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      recordedAt: true,
      receivedAt: true,
      latitude: true,
      longitude: true,
      source: true,
      geocodedCity: true,
      geocodedCountryCode: true,
      geocodedAt: true,
      excludedReason: true,
    },
  })
  console.log(`\nLast ${events.length} LocationEvents (most recent first):`)
  for (const e of events) {
    const cell = `${e.latitude.toFixed(3)},${e.longitude.toFixed(3)}`
    const place = e.geocodedCity ? `${e.geocodedCountryCode}|${e.geocodedCity}` : '(not geocoded)'
    const ex = e.excludedReason ? ` [EXCLUDED: ${e.excludedReason}]` : ''
    console.log(
      `  ${e.recordedAt.toISOString()} ${e.source.padEnd(11)} cell=${cell.padEnd(18)} ${place}${ex}`
    )
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
