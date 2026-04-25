/**
 * One-off: reset geocoded_* fields on LocationEvents whose geocoded_country_code
 * disagrees with the clear majority of neighbours at the same coord cell. These
 * are the rows that the parallel-Promise.all bug in /api/v1/cargo poisoned by
 * trusting wrong-coord Nominatim responses. Resetting (not excluding) lets the
 * daily backfill-geocode cron re-query — and with the new request/response
 * sanity check, the next result will be correct or null.
 *
 * Usage:
 *   npx tsx scripts/cleanup-mis-geocoded.ts              # dry run
 *   npx tsx scripts/cleanup-mis-geocoded.ts --apply      # reset rows
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const DRY_RUN = !process.argv.includes('--apply')
const MIN_MAJORITY_SIZE = 3          // majority must have ≥ this many events
const MAX_MINORITY_RATIO = 0.3       // minority must be ≤ 30% of majority

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function cellKey(lat: number, lng: number): string {
  // ~100m cell at any latitude, consistent with geocoding.ts cacheKey
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --apply to reset) ===' : '=== APPLYING RESETS ===')

  const events = await prisma.locationEvent.findMany({
    where: {
      geocodedCountryCode: { not: null },
      excludedReason: null,
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      geocodedCity: true,
      geocodedCountryCode: true,
      geocodedAt: true,
    },
  })

  // Bucket by coord cell → country → count
  const cells = new Map<string, { counts: Map<string, number>; events: typeof events }>()
  for (const e of events) {
    const key = cellKey(e.latitude, e.longitude)
    let cell = cells.get(key)
    if (!cell) {
      cell = { counts: new Map(), events: [] }
      cells.set(key, cell)
    }
    cell.events.push(e)
    const cc = e.geocodedCountryCode ?? '?'
    cell.counts.set(cc, (cell.counts.get(cc) ?? 0) + 1)
  }

  const toReset: string[] = []
  let cellsInspected = 0

  for (const [key, cell] of cells) {
    if (cell.counts.size < 2) continue  // all agree — nothing to do
    cellsInspected++

    // Find majority country
    let majority = { cc: '', count: 0 }
    for (const [cc, count] of cell.counts) {
      if (count > majority.count) majority = { cc, count }
    }
    if (majority.count < MIN_MAJORITY_SIZE) continue

    // Flag anything that disagrees AND is ≤ 30% the size of the majority
    for (const [cc, count] of cell.counts) {
      if (cc === majority.cc) continue
      if (count > majority.count * MAX_MINORITY_RATIO) continue
      const bad = cell.events.filter((e) => e.geocodedCountryCode === cc)
      for (const e of bad) toReset.push(e.id)
      console.log(
        `  [RESET] cell ${key}: ${count}× ${cc} (${bad[0]?.geocodedCity}) vs ${majority.count}× ${majority.cc} majority`
      )
    }
  }

  console.log(`\nCells inspected: ${cellsInspected}`)
  console.log(`Events to reset: ${toReset.length}`)

  if (!DRY_RUN && toReset.length > 0) {
    for (let i = 0; i < toReset.length; i += 100) {
      const batch = toReset.slice(i, i + 100)
      await prisma.locationEvent.updateMany({
        where: { id: { in: batch } },
        data: {
          geocodedCity: null,
          geocodedArea: null,
          geocodedCountry: null,
          geocodedCountryCode: null,
          geocodedAt: null,  // next backfill-geocode cron will re-query
        },
      })
    }
    console.log(`✓ Reset ${toReset.length} events — backfill-geocode cron will re-query`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
