/**
 * One-off backfill: demote factory-auto-registered labels from ACTIVE to
 * INVENTORY.
 *
 * Context: Prior to this fix, `processLocationReport()` auto-registered new
 * labels (first SIM signal from UTEC factory) with `status=ACTIVE`. That made
 * the Scan & Link modal, admin fleet counts, etc. show factory-only labels as
 * "ACTIVE" before any customer had touched them. The code now lands them as
 * `INVENTORY`; this script fixes the existing rows.
 *
 * Safety filters — only demote labels that are unambiguously factory-only:
 *   - status = 'ACTIVE'
 *   - activatedAt IS NULL    (never went through a user-facing activation)
 *   - manufacturedAt IS NOT NULL   (was auto-registered, not manually created)
 *   - no orderLabel rows     (not purchased via any order)
 *   - no shipmentLabel rows  (not in any dispatch)
 *   - no shipments rows      (not in any cargo shipment via legacy 1:1 link)
 *
 * Safe to re-run — idempotent.
 *
 * Usage: npx tsx scripts/backfill-factory-inventory.ts [--apply]
 *   Without --apply: dry run (prints what would change).
 *   With --apply: actually updates rows.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}
const adapter = new PrismaNeon({ connectionString })
const db = new PrismaClient({ adapter })

const apply = process.argv.includes('--apply')

async function main() {
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)

  const candidates = await db.label.findMany({
    where: {
      status: 'ACTIVE',
      activatedAt: null,
      manufacturedAt: { not: null },
      orderLabels: { none: {} },
      shipmentLabels: { none: {} },
      shipments: { none: {} },
    },
    select: {
      id: true,
      deviceId: true,
      displayId: true,
      iccid: true,
      manufacturedAt: true,
      lastSeenAt: true,
      batteryPct: true,
    },
  })

  console.log(`Found ${candidates.length} factory-only ACTIVE label(s):`)
  for (const l of candidates.slice(0, 20)) {
    console.log(
      `  ${l.displayId || l.deviceId}  iccid=${l.iccid ?? '-'}  ` +
        `manufactured=${l.manufacturedAt?.toISOString() ?? '-'}  ` +
        `lastSeen=${l.lastSeenAt?.toISOString() ?? '-'}  ` +
        `battery=${l.batteryPct ?? '-'}`
    )
  }
  if (candidates.length > 20) {
    console.log(`  ... and ${candidates.length - 20} more`)
  }

  if (!apply) {
    console.log('\nDry run — no changes written. Re-run with --apply to update.')
    return
  }

  if (candidates.length === 0) {
    console.log('\nNothing to update.')
    return
  }

  const result = await db.label.updateMany({
    where: { id: { in: candidates.map((l) => l.id) } },
    data: { status: 'INVENTORY' },
  })

  console.log(`\nUpdated ${result.count} label(s) ACTIVE → INVENTORY.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
