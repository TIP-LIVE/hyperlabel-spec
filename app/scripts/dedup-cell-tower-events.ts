/**
 * One-off script: deduplicate historical CELL_TOWER LocationEvents.
 *
 * For each label, groups CELL_TOWER events by 5-minute windows and removes
 * events that are within 500m of an earlier event in the same window.
 * Keeps the earliest event per cluster.
 *
 * Usage:
 *   npx tsx scripts/dedup-cell-tower-events.ts          # dry run (default)
 *   npx tsx scripts/dedup-cell-tower-events.ts --apply   # actually delete
 */

import { config } from 'dotenv'
// Load .env.local first (has DATABASE_URL), then .env as fallback
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'

// Neon serverless driver needs a WebSocket polyfill in Node.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const PROXIMITY_RADIUS_M = 500
const WINDOW_MS = 5 * 60 * 1000
const DRY_RUN = !process.argv.includes('--apply')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --apply to delete) ===' : '=== APPLYING DELETES ===')

  // Get all labels that have CELL_TOWER events
  const labels = await prisma.locationEvent.findMany({
    where: { source: 'CELL_TOWER' },
    select: { labelId: true },
    distinct: ['labelId'],
  })

  console.log(`Found ${labels.length} labels with CELL_TOWER events`)

  let totalDupes = 0

  for (const { labelId } of labels) {
    const events = await prisma.locationEvent.findMany({
      where: { labelId, source: 'CELL_TOWER' },
      orderBy: { recordedAt: 'asc' },
      select: { id: true, latitude: true, longitude: true, recordedAt: true },
    })

    const toDelete: string[] = []
    const kept: typeof events = []

    for (const ev of events) {
      // Check if this event is within 500m and 5min of any kept event
      const isDupe = kept.some(
        (k) =>
          Math.abs(ev.recordedAt.getTime() - k.recordedAt.getTime()) < WINDOW_MS &&
          haversineM(ev.latitude, ev.longitude, k.latitude, k.longitude) < PROXIMITY_RADIUS_M
      )

      if (isDupe) {
        toDelete.push(ev.id)
      } else {
        kept.push(ev)
      }
    }

    if (toDelete.length > 0) {
      console.log(`  Label ${labelId}: ${events.length} events → ${kept.length} kept, ${toDelete.length} duplicates`)
      totalDupes += toDelete.length

      if (!DRY_RUN) {
        // Delete in batches of 100
        for (let i = 0; i < toDelete.length; i += 100) {
          const batch = toDelete.slice(i, i + 100)
          await prisma.locationEvent.deleteMany({
            where: { id: { in: batch } },
          })
        }
      }
    }
  }

  console.log(`\nTotal duplicates ${DRY_RUN ? 'found' : 'deleted'}: ${totalDupes}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
