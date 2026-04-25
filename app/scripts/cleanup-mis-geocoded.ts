/**
 * One-off: reset geocoded_* fields on LocationEvents whose (country, city) pair
 * disagrees with the clear majority of neighbours at the same ~100m coord cell.
 *
 * Catches both:
 *   - cross-country poisoning (e.g. Warsaw → Bao'an, China)
 *   - intra-country city poisoning (e.g. Yantian → Bao'an, both China)
 *
 * Both stem from the same parallel-Promise.all bug in /api/v1/cargo trusting
 * wrong-coord Nominatim responses. The earlier version of this script only
 * flagged country-level disagreement, so intra-country cases survived. At a
 * 3-decimal (~100m) cell granularity, two different cities/districts in the
 * same cell is essentially always a poisoned row, not a real boundary.
 *
 * Resetting (not excluding) lets the daily backfill-geocode cron re-query —
 * and with the new request/response sanity check, the next result will be
 * correct or null.
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

function placeKey(e: { geocodedCountryCode: string | null; geocodedCity: string | null }): string {
  return `${e.geocodedCountryCode ?? '?'}|${e.geocodedCity ?? '?'}`
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

  // Bucket by coord cell → place(country|city) → count
  const cells = new Map<string, { counts: Map<string, number>; events: typeof events }>()
  for (const e of events) {
    const key = cellKey(e.latitude, e.longitude)
    let cell = cells.get(key)
    if (!cell) {
      cell = { counts: new Map(), events: [] }
      cells.set(key, cell)
    }
    cell.events.push(e)
    const place = placeKey(e)
    cell.counts.set(place, (cell.counts.get(place) ?? 0) + 1)
  }

  const toReset: string[] = []
  let cellsInspected = 0

  for (const [key, cell] of cells) {
    if (cell.counts.size < 2) continue  // all agree — nothing to do
    cellsInspected++

    // Find majority place
    let majority = { place: '', count: 0 }
    for (const [place, count] of cell.counts) {
      if (count > majority.count) majority = { place, count }
    }
    if (majority.count < MIN_MAJORITY_SIZE) continue

    // Flag anything that disagrees AND is ≤ 30% the size of the majority
    for (const [place, count] of cell.counts) {
      if (place === majority.place) continue
      if (count > majority.count * MAX_MINORITY_RATIO) continue
      const bad = cell.events.filter((e) => placeKey(e) === place)
      for (const e of bad) toReset.push(e.id)
      console.log(
        `  [RESET] cell ${key}: ${count}× ${place} vs ${majority.count}× ${majority.place} majority`
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
