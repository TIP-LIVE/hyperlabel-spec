/**
 * Audit + backfill label.status mismatches.
 *
 * Default: dry-run, prints findings only.
 * --apply: revert orphan SOLD labels (no Order linkage, no active shipment)
 *          back to INVENTORY. Mirrors the dispatch DELETE fix.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/check-label-statuses.ts
 *   DATABASE_URL=... npx tsx scripts/check-label-statuses.ts --apply
 *   DATABASE_URL=... npx tsx scripts/check-label-statuses.ts --apply --all
 *     (--all scans every label in DB; without it, only the screenshot's 10 labels)
 */
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

const APPLY = process.argv.includes('--apply')
const ALL = process.argv.includes('--all')

const SCREENSHOT_IDS = [
  '002112312',
  '002129999',
  '002092425',
  '002106428',
  '000038588',
  '001961112',
  '001986006',
  '002048058',
  '002059299',
  '002069778',
]

async function main() {
  const labels = await db.label.findMany({
    where: ALL ? undefined : { displayId: { in: SCREENSHOT_IDS } },
    include: {
      orderLabels: { select: { orderId: true, order: { select: { status: true } } } },
      shipmentLabels: {
        include: {
          shipment: { select: { id: true, type: true, status: true } },
        },
      },
      shipments: { select: { id: true, type: true, status: true } },
      _count: { select: { locations: true } },
    },
  })

  const orphansToRevert: { id: string; displayId: string | null }[] = []

  for (const l of labels) {
    const hasOrder = l.orderLabels.length > 0
    const orderInfo = l.orderLabels.map((ol) => ol.order.status).join(', ')

    const dispatches = l.shipmentLabels.filter((sl) => sl.shipment.type === 'LABEL_DISPATCH')
    const dispatchInfo = dispatches.map((sl) => sl.shipment.status).join(', ')

    const cargoShipments = l.shipments.filter((s) => s.type === 'CARGO_TRACKING')
    const cargoInfo = cargoShipments.map((s) => s.status).join(', ')

    const hasActiveShipment =
      dispatches.some((sl) => sl.shipment.status === 'PENDING' || sl.shipment.status === 'IN_TRANSIT') ||
      cargoShipments.some((s) => s.status === 'PENDING' || s.status === 'IN_TRANSIT')

    let verdict: 'OK' | 'MISMATCH' | 'WARN' = 'OK'
    let reason = ''
    let action: string | null = null

    if (l.status === 'SOLD' && !hasOrder && !hasActiveShipment) {
      verdict = 'MISMATCH'
      reason = 'SOLD without Order linkage or active shipment'
      action = 'revert SOLD → INVENTORY'
      orphansToRevert.push({ id: l.id, displayId: l.displayId })
    } else if (l.status === 'INVENTORY' && hasOrder) {
      verdict = 'MISMATCH'
      reason = `INVENTORY but has order(s) [${orderInfo}]`
    } else if (l.activatedAt && l.status === 'INVENTORY') {
      verdict = 'WARN'
      reason = 'activatedAt set but status=INVENTORY'
    }

    if (verdict !== 'OK' || !ALL) {
      console.log(
        `\n${l.displayId ?? l.id}  status=${l.status}  loc#=${l._count.locations}  activatedAt=${l.activatedAt?.toISOString() ?? '-'}`,
      )
      console.log(`  orders: ${hasOrder ? orderInfo : '(none)'}`)
      console.log(`  dispatches: ${dispatchInfo || '(none)'}`)
      console.log(`  cargo shipments: ${cargoInfo || '(none)'}`)
      console.log(`  → ${verdict}${reason ? `: ${reason}` : ''}${action ? ` — ${action}` : ''}`)
    }
  }

  if (!ALL) {
    const missing = SCREENSHOT_IDS.filter((id) => !labels.find((l) => l.displayId === id))
    if (missing.length > 0) console.log(`\nMissing from DB: ${missing.join(', ')}`)
  }

  console.log(`\n${orphansToRevert.length} orphan SOLD label(s) eligible for INVENTORY revert.`)

  if (orphansToRevert.length > 0) {
    if (APPLY) {
      const result = await db.label.updateMany({
        where: { id: { in: orphansToRevert.map((o) => o.id) }, status: 'SOLD' },
        data: { status: 'INVENTORY' },
      })
      console.log(`✅ Reverted ${result.count} label(s) to INVENTORY:`)
      for (const o of orphansToRevert) console.log(`  - ${o.displayId ?? o.id}`)
    } else {
      console.log('Run with --apply to revert.')
    }
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
