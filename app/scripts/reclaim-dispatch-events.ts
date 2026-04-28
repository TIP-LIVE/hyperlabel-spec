/**
 * One-off backfill: reclaim post-delivery events from a recently-DELIVERED
 * LABEL_DISPATCH onto an existing CARGO_TRACKING shipment for the same
 * label. Mirrors the backfill that now runs at cargo creation time
 * (app/src/app/api/v1/cargo/route.ts) — needed for cargos that were created
 * before the dispatch-grace fix landed.
 *
 * Background: until the fix in `device-report.ts`, the dispatch's 1-hour
 * DELIVERED grace window stole location events from any cargo created within
 * that hour. This script moves those events back where they belong.
 *
 * Rules:
 *  - Only events from DELIVERED dispatches for the cargo's label
 *  - Only events with recordedAt > dispatch.deliveredAt (post-delivery)
 *  - Only events with recordedAt > cargo.createdAt - 1h (within the cargo's
 *    plausible activity window — guards against pulling weeks-old stuck
 *    events into a freshly-created cargo)
 *
 * Usage:
 *   npx tsx scripts/reclaim-dispatch-events.ts <cargo-id-or-label-id>
 *   npx tsx scripts/reclaim-dispatch-events.ts <id> --apply
 *
 * The id can be the cargo shipment cuid, the label displayId/deviceId/iccid/imei,
 * or the cargo's shareCode.
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
const DRY_RUN = !process.argv.includes('--apply')

if (!arg) {
  console.error('Usage: reclaim-dispatch-events.ts <cargo-id-or-label-id> [--apply]')
  process.exit(1)
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --apply to execute) ===\n' : '=== APPLYING ===\n')

  const cargo = await prisma.shipment.findFirst({
    where: {
      type: 'CARGO_TRACKING',
      OR: [
        { id: arg },
        { shareCode: arg },
        { label: { displayId: arg } },
        { label: { deviceId: arg } },
        { label: { iccid: arg } },
        { label: { imei: arg } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: { label: { select: { id: true, displayId: true, deviceId: true } } },
  })

  if (!cargo) {
    console.error(`No CARGO_TRACKING shipment matched "${arg}".`)
    process.exit(1)
  }
  if (!cargo.labelId || !cargo.label) {
    console.error(`Cargo ${cargo.id} has no labelId — nothing to do.`)
    process.exit(1)
  }

  console.log(`Cargo: ${cargo.id} "${cargo.name ?? '(unnamed)'}" status=${cargo.status}`)
  console.log(`  createdAt=${cargo.createdAt.toISOString()}`)
  console.log(`  label=${cargo.label.displayId ?? cargo.label.deviceId} (${cargo.label.id})`)

  const cargoWindowStart = new Date(cargo.createdAt.getTime() - 60 * 60 * 1000)

  const dispatches = await prisma.shipment.findMany({
    where: {
      type: 'LABEL_DISPATCH',
      status: 'DELIVERED',
      shipmentLabels: { some: { labelId: cargo.label.id } },
    },
    select: { id: true, name: true, deliveredAt: true },
    orderBy: { deliveredAt: 'desc' },
  })

  if (dispatches.length === 0) {
    console.log('\nNo DELIVERED dispatches reference this label. Nothing to reclaim.')
    return
  }

  let totalCandidates = 0
  const plan: { dispatchId: string; dispatchName: string | null; deliveredAt: Date; eventIds: string[] }[] = []

  for (const d of dispatches) {
    if (!d.deliveredAt) continue

    const events = await prisma.locationEvent.findMany({
      where: {
        labelId: cargo.label.id,
        shipmentId: d.id,
        recordedAt: { gt: d.deliveredAt, gte: cargoWindowStart },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        id: true,
        recordedAt: true,
        latitude: true,
        longitude: true,
        geocodedCity: true,
      },
    })

    if (events.length === 0) continue

    console.log(`\nDispatch "${d.name ?? '(unnamed)'}" (${d.id})`)
    console.log(`  deliveredAt=${d.deliveredAt.toISOString()}`)
    console.log(`  ${events.length} event(s) to reclaim:`)
    for (const e of events.slice(0, 10)) {
      const place = e.geocodedCity ?? '(not geocoded)'
      console.log(`    ${e.recordedAt.toISOString()}  ${e.latitude.toFixed(4)},${e.longitude.toFixed(4)}  ${place}`)
    }
    if (events.length > 10) console.log(`    … and ${events.length - 10} more`)

    plan.push({
      dispatchId: d.id,
      dispatchName: d.name,
      deliveredAt: d.deliveredAt,
      eventIds: events.map((e) => e.id),
    })
    totalCandidates += events.length
  }

  if (totalCandidates === 0) {
    console.log('\nNothing to reclaim.')
    return
  }

  console.log(`\nTotal: ${totalCandidates} event(s) to move to cargo ${cargo.id}.`)

  if (DRY_RUN) {
    console.log('\nPass --apply to execute.')
    return
  }

  let moved = 0
  for (const p of plan) {
    const r = await prisma.locationEvent.updateMany({
      where: { id: { in: p.eventIds } },
      data: { shipmentId: cargo.id },
    })
    moved += r.count
    console.log(`  ✓ moved ${r.count} from dispatch ${p.dispatchId}`)
  }
  console.log(`\n✓ Reclaimed ${moved} event(s) onto cargo ${cargo.id}.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
