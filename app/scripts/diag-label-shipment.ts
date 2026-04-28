/**
 * Diagnostic: dump LocationEvent.shipmentId for a label, plus all shipments
 * that reference the label, so we can tell whether events are linked to the
 * "right" shipment.
 *
 * Usage: npx tsx scripts/diag-label-shipment.ts <displayId|iccid|imei|deviceId>
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
  console.error('Usage: diag-label-shipment.ts <id>')
  process.exit(1)
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const label = await prisma.label.findFirst({
    where: { OR: [{ displayId: arg }, { deviceId: arg }, { iccid: arg }, { imei: arg }] },
  })
  if (!label) { console.error('No label.'); return }

  console.log(`Label ${label.displayId} (${label.deviceId})`)
  console.log(`  status=${label.status} manufacturedAt=${label.manufacturedAt?.toISOString()} activatedAt=${label.activatedAt?.toISOString()}`)

  // All shipments where this label is the primary labelId (CARGO_TRACKING)
  const cargoShipments = await prisma.shipment.findMany({
    where: { labelId: label.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, type: true, status: true, name: true, createdAt: true, deliveredAt: true },
  })
  console.log(`\nShipments where labelId = ${label.id}:`)
  for (const s of cargoShipments) {
    console.log(`  ${s.id}  ${s.type.padEnd(15)} ${s.status.padEnd(11)} created=${s.createdAt.toISOString()} delivered=${s.deliveredAt?.toISOString() ?? '-'} name=${s.name ?? '-'}`)
  }

  // All LABEL_DISPATCH shipments referencing this label via ShipmentLabel join
  const dispatches = await prisma.shipmentLabel.findMany({
    where: { labelId: label.id },
    include: {
      shipment: {
        select: { id: true, type: true, status: true, name: true, createdAt: true, deliveredAt: true },
      },
    },
  })
  console.log(`\nLABEL_DISPATCH shipments via ShipmentLabel:`)
  for (const sl of dispatches) {
    const s = sl.shipment
    console.log(`  ${s.id}  ${s.type.padEnd(15)} ${s.status.padEnd(11)} created=${s.createdAt.toISOString()} delivered=${s.deliveredAt?.toISOString() ?? '-'} name=${s.name ?? '-'}`)
  }

  // Last 10 events with shipmentId + excludedReason
  const events = await prisma.locationEvent.findMany({
    where: { labelId: label.id },
    orderBy: { recordedAt: 'desc' },
    take: 10,
    select: {
      id: true, recordedAt: true, source: true, eventType: true,
      shipmentId: true, excludedReason: true, latitude: true, longitude: true,
      geocodedCity: true,
    },
  })
  console.log(`\nLast ${events.length} events:`)
  for (const e of events) {
    const ex = e.excludedReason ? ` [EXCLUDED: ${e.excludedReason}]` : ''
    console.log(
      `  ${e.recordedAt.toISOString()} src=${e.source.padEnd(11)} type=${(e.eventType ?? '-').padEnd(10)} shipmentId=${e.shipmentId ?? '(null)'}${ex}  ${e.latitude.toFixed(3)},${e.longitude.toFixed(3)} ${e.geocodedCity ?? ''}`
    )
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
