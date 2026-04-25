/**
 * Reset geocoded_* fields on all LocationEvents at a specific ~100m coord cell
 * (lat/lng rounded to 3 decimals). Use for unanimous-cell poisoning that the
 * majority-vote `cleanup-mis-geocoded.ts` script can't detect — every event at
 * the cell is poisoned with the same wrong label, so there's no minority to
 * flag.
 *
 * After reset, the daily backfill-geocode cron will re-query under the new
 * Nominatim sanity check (10km mismatch rejection added in 01981ff) and
 * either get the correct answer or null.
 *
 * Usage:
 *   npx tsx scripts/reset-geocoded-cell.ts <lat> <lng>             # dry run
 *   npx tsx scripts/reset-geocoded-cell.ts <lat> <lng> --apply     # reset rows
 *
 * Example (Andrii's traveler_CN at Yantian, mis-labelled "Bao'an District"):
 *   npx tsx scripts/reset-geocoded-cell.ts 22.572 114.281 --apply
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const DRY_RUN = !process.argv.includes('--apply')

if (positional.length < 2) {
  console.error('Usage: reset-geocoded-cell.ts <lat> <lng> [--apply]')
  process.exit(1)
}

const LAT = parseFloat(positional[0])
const LNG = parseFloat(positional[1])

if (!Number.isFinite(LAT) || !Number.isFinite(LNG)) {
  console.error('Invalid lat/lng')
  process.exit(1)
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --apply to reset) ===' : '=== APPLYING RESETS ===')
  console.log(`Cell: ${LAT.toFixed(3)}, ${LNG.toFixed(3)} (±0.0005°, ~100m square)`)

  const where = {
    latitude: { gte: LAT - 0.0005, lte: LAT + 0.0005 },
    longitude: { gte: LNG - 0.0005, lte: LNG + 0.0005 },
    geocodedCity: { not: null },
    excludedReason: null,
  }

  const events = await prisma.locationEvent.findMany({
    where,
    select: {
      id: true,
      geocodedCity: true,
      geocodedCountryCode: true,
      recordedAt: true,
      labelId: true,
    },
    orderBy: { recordedAt: 'desc' },
  })

  if (events.length === 0) {
    console.log('No geocoded events found at this cell.')
    return
  }

  // Distribution by (country|city)
  const byPlace = new Map<string, number>()
  for (const e of events) {
    const key = `${e.geocodedCountryCode}|${e.geocodedCity}`
    byPlace.set(key, (byPlace.get(key) ?? 0) + 1)
  }
  console.log(`\nFound ${events.length} geocoded event(s):`)
  for (const [place, count] of [...byPlace.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}× ${place}`)
  }

  const labels = new Set(events.map((e) => e.labelId))
  console.log(`\nAcross ${labels.size} distinct label(s)`)
  console.log(`Most recent: ${events[0].recordedAt.toISOString()}`)
  console.log(`Oldest: ${events[events.length - 1].recordedAt.toISOString()}`)

  if (DRY_RUN) {
    console.log(`\nWould reset ${events.length} events. Pass --apply to execute.`)
    return
  }

  const result = await prisma.locationEvent.updateMany({
    where,
    data: {
      geocodedCity: null,
      geocodedArea: null,
      geocodedCountry: null,
      geocodedCountryCode: null,
      geocodedAt: null,
    },
  })
  console.log(`\n✓ Reset ${result.count} events — backfill-geocode cron will re-query`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
