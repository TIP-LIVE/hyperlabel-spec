/**
 * Find orgs that have more LABEL_DISPATCH reservations than purchased labels.
 *
 * Background: before commit 23e94a6, the user-facing dispatch flow counted
 * only ShipmentLabel rows when computing "actively dispatched" — missing
 * admin-created blank reservations (labelCount set, no ShipmentLabel rows
 * yet). Orgs in that window could end up with a blank reservation AND a
 * user-created duplicate on the same purchased label. Cron will age the
 * blanks out at 14 days, but this tool lets an admin clean them up now.
 *
 * Usage:
 *   npx tsx scripts/audit-dispatch-overbook.ts                  # audit only
 *   npx tsx scripts/audit-dispatch-overbook.ts --org ORG_ID     # single-org detail
 *   npx tsx scripts/audit-dispatch-overbook.ts --cancel SHIP_ID # cancel one PENDING dispatch
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const ORG_FLAG = process.argv.indexOf('--org')
const TARGET_ORG = ORG_FLAG !== -1 ? process.argv[ORG_FLAG + 1] : null

const CANCEL_FLAG = process.argv.indexOf('--cancel')
const CANCEL_SHIPMENT_ID = CANCEL_FLAG !== -1 ? process.argv[CANCEL_FLAG + 1] : null

type ActiveDispatch = {
  id: string
  name: string | null
  shareCode: string
  status: string
  labelCount: number | null
  shipmentLabelCount: number
  addressSubmittedAt: Date | null
  createdAt: Date
  destinationAddress: string | null
  orderId: string | null
}

function reservedFor(d: ActiveDispatch): number {
  return Math.max(d.labelCount ?? 0, d.shipmentLabelCount)
}

function ageHours(d: Date): number {
  return (Date.now() - d.getTime()) / 3_600_000
}

async function auditOrg(orgId: string): Promise<{
  orgId: string
  totalBought: number
  activelyDispatched: number
  dispatches: ActiveDispatch[]
}> {
  const [purchased, dispatches] = await Promise.all([
    prisma.order.aggregate({
      where: {
        orgId,
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        totalAmount: { gt: 0 },
      },
      _sum: { quantity: true },
    }),
    prisma.shipment.findMany({
      where: {
        orgId,
        type: 'LABEL_DISPATCH',
        status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] },
      },
      select: {
        id: true,
        name: true,
        shareCode: true,
        status: true,
        labelCount: true,
        addressSubmittedAt: true,
        createdAt: true,
        destinationAddress: true,
        orderId: true,
        _count: { select: { shipmentLabels: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const totalBought = purchased._sum.quantity ?? 0
  const rows: ActiveDispatch[] = dispatches.map((d) => ({
    id: d.id,
    name: d.name,
    shareCode: d.shareCode,
    status: d.status,
    labelCount: d.labelCount,
    shipmentLabelCount: d._count.shipmentLabels,
    addressSubmittedAt: d.addressSubmittedAt,
    createdAt: d.createdAt,
    destinationAddress: d.destinationAddress,
    orderId: d.orderId,
  }))
  const activelyDispatched = rows.reduce((sum, d) => sum + reservedFor(d), 0)

  return { orgId, totalBought, activelyDispatched, dispatches: rows }
}

function printOrgReport(r: Awaited<ReturnType<typeof auditOrg>>, verbose = false) {
  const over = r.activelyDispatched - r.totalBought
  const tag = over > 0 ? `OVER by ${over}` : 'OK'
  console.log(
    `[${tag}] org=${r.orgId} bought=${r.totalBought} reserved=${r.activelyDispatched} dispatches=${r.dispatches.length}`,
  )
  if (!verbose && over <= 0) return

  for (const d of r.dispatches) {
    const shape =
      d.shipmentLabelCount === 0 && (d.labelCount ?? 0) > 0
        ? 'BLANK'
        : d.shipmentLabelCount > 0 && (d.labelCount ?? 0) === 0
          ? 'USER'
          : 'MIXED'
    const addrState = d.addressSubmittedAt ? 'addr✓' : 'addr✗'
    console.log(
      `    - ${d.id}  ${shape}  ${d.status}  reserved=${reservedFor(d)}  ` +
        `age=${ageHours(d.createdAt).toFixed(0)}h  ${addrState}  "${d.name ?? '-'}"  → ${d.destinationAddress ?? '(no dest)'}`,
    )
  }
}

async function auditAll() {
  const orgs = await prisma.shipment.findMany({
    where: {
      type: 'LABEL_DISPATCH',
      status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] },
      orgId: { not: null },
    },
    select: { orgId: true },
    distinct: ['orgId'],
  })

  console.log(`Scanning ${orgs.length} orgs with active LABEL_DISPATCH...\n`)
  const reports = await Promise.all(
    orgs.map((o) => auditOrg(o.orgId as string)),
  )
  const overbooked = reports.filter((r) => r.activelyDispatched > r.totalBought)

  if (overbooked.length === 0) {
    console.log('No over-booked orgs found.')
    return
  }

  console.log(`Found ${overbooked.length} over-booked org(s):\n`)
  for (const r of overbooked) {
    printOrgReport(r, true)
    console.log()
  }
  console.log(
    'To cancel a specific PENDING blank reservation:\n' +
      '  npx tsx scripts/audit-dispatch-overbook.ts --cancel <SHIPMENT_ID>',
  )
}

async function cancelShipment(shipmentId: string) {
  const s = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      type: true,
      status: true,
      name: true,
      orgId: true,
      labelCount: true,
      destinationAddress: true,
      addressSubmittedAt: true,
      _count: { select: { shipmentLabels: true } },
    },
  })

  if (!s) {
    console.error(`Shipment ${shipmentId} not found.`)
    process.exit(1)
  }
  if (s.type !== 'LABEL_DISPATCH') {
    console.error(`Shipment ${shipmentId} is ${s.type}, not LABEL_DISPATCH. Refusing.`)
    process.exit(1)
  }
  if (s.status !== 'PENDING') {
    console.error(
      `Shipment ${shipmentId} is ${s.status}. Only PENDING dispatches can be cancelled via this script — ` +
        'anything past PENDING has been physically shipped.',
    )
    process.exit(1)
  }

  console.log(`About to cancel:`)
  console.log(`  id:          ${s.id}`)
  console.log(`  name:        ${s.name ?? '(unnamed)'}`)
  console.log(`  orgId:       ${s.orgId}`)
  console.log(`  labelCount:  ${s.labelCount ?? 0}`)
  console.log(`  labels linked: ${s._count.shipmentLabels}`)
  console.log(`  destination: ${s.destinationAddress ?? '(none)'}`)
  console.log(`  addressSubmittedAt: ${s.addressSubmittedAt?.toISOString() ?? '(none)'}`)
  console.log()

  const updated = await prisma.shipment.updateMany({
    where: { id: shipmentId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })

  if (updated.count === 0) {
    console.error('Shipment status changed between audit and cancel — aborted.')
    process.exit(1)
  }
  console.log(`✓ Cancelled shipment ${shipmentId}.`)
}

async function main() {
  if (CANCEL_SHIPMENT_ID) {
    await cancelShipment(CANCEL_SHIPMENT_ID)
  } else if (TARGET_ORG) {
    const r = await auditOrg(TARGET_ORG)
    printOrgReport(r, true)
  } else {
    await auditAll()
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
