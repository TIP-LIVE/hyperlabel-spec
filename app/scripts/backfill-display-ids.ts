/**
 * Backfill counters and displayIds for all existing labels.
 *
 * Usage:
 *   cd app && npx tsx scripts/backfill-display-ids.ts [--dry-run]
 *
 * For production, pull env first:
 *   npx vercel env pull .env.production.local
 *   DATABASE_URL="$(grep DATABASE_URL .env.production.local | cut -d= -f2-)" \
 *     npx tsx scripts/backfill-display-ids.ts
 */
import { db } from '../src/lib/db'
import { formatDisplayId } from '../src/lib/label-id'

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const labels = await db.label.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, deviceId: true, counter: true, imei: true, displayId: true },
  })

  console.log(`Found ${labels.length} labels`)

  // Preserve existing counters; only assign new ones to labels missing one
  const usedCounters = new Set<number>()
  for (const l of labels) {
    if (l.counter != null) usedCounters.add(l.counter)
  }
  let nextCounter = 1

  let assigned = 0
  let displaySet = 0
  let skipped = 0

  for (const label of labels) {
    let counter = label.counter
    if (counter == null) {
      while (usedCounters.has(nextCounter)) nextCounter++
      counter = nextCounter
      usedCounters.add(counter)
      nextCounter++
      assigned++
    }

    const nextDisplayId = formatDisplayId(counter, label.imei)
    const needsCounter = label.counter !== counter
    const needsDisplay = nextDisplayId && nextDisplayId !== label.displayId

    if (!needsCounter && !needsDisplay) {
      skipped++
      continue
    }

    if (needsDisplay) displaySet++

    console.log(
      `[${dryRun ? 'DRY' : 'UPDATE'}] ${label.deviceId}  counter=${counter}  displayId=${nextDisplayId ?? '(null — no IMEI)'}`
    )

    if (!dryRun) {
      await db.label.update({
        where: { id: label.id },
        data: {
          ...(needsCounter ? { counter } : {}),
          ...(needsDisplay ? { displayId: nextDisplayId } : {}),
        },
      })
    }
  }

  console.log(
    `\nDone. assigned counters: ${assigned}, displayIds set: ${displaySet}, skipped: ${skipped}`
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
