/**
 * Soft-exclude LocationEvents written by the fallback chain on non-location
 * webhooks (the "Bao'an phantom" bug — see CLAUDE.md rule #6 in the Onomondo
 * Webhook Handler section, fixed in the route handler April 2026).
 *
 * Detection strategy:
 *   1. Find all LocationEvents for the label whose lat/lng exactly matches
 *      `label.lastLatitude`/`lastLongitude` (the cached coord that the
 *      fallback chain stamped onto every non-location webhook).
 *   2. Correlate each candidate with WebhookLog (matched by iccid + the
 *      webhook's body.time field === LocationEvent.recordedAt). Events
 *      whose source webhook had `eventType === 'location'` are GENUINE
 *      cell tower readings that happen to be at the cached coords — keep.
 *      Events whose source had any other type, or whose log has been
 *      pruned (>7 days), are phantoms — exclude.
 *
 * Webhook logs are pruned after 7 days, so older events can't be verified
 * and default to "phantom". For the case this was written for (Andrii's
 * traveler_CN), the bug started ~12 days ago so most logs are gone — but
 * even there, ~one initial genuine event would be misclassified, which
 * is acceptable: the event's coord is stamped on label.lastLat/lng and
 * the next real `location` webhook will re-establish that.
 *
 * After soft-exclude, also clear `label.lastLatitude/lastLongitude` so
 * the (now-fixed) handler can't re-grab the bad value as a fallback for
 * a future location-type event with null lat/lng + Google Geolocation
 * failure. The next real `location` webhook re-populates the cache.
 *
 * Usage:
 *   npx tsx scripts/cleanup-fallback-poison.ts <displayId|iccid|imei|deviceId>
 *   npx tsx scripts/cleanup-fallback-poison.ts <id> --apply
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
  console.error('Usage: cleanup-fallback-poison.ts <displayId|iccid|imei|deviceId> [--apply]')
  process.exit(1)
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const EXCLUSION_REASON = 'fallback_phantom'

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (pass --apply to execute) ===' : '=== APPLYING ===')

  const label = await prisma.label.findFirst({
    where: {
      OR: [{ displayId: arg }, { deviceId: arg }, { iccid: arg }, { imei: arg }],
    },
  })
  if (!label) {
    console.error(`No label matched "${arg}".`)
    process.exit(1)
  }
  console.log(`Label ${label.displayId} (${label.deviceId})`)
  console.log(`  cached: lastLat=${label.lastLatitude} lastLng=${label.lastLongitude}`)

  if (label.lastLatitude == null || label.lastLongitude == null) {
    console.log('Label has no cached lastLat/lng — nothing to do.')
    return
  }

  // Match exact coord. Float equality is fine here because the poisoned events
  // were written from the cached value verbatim, no recomputation. Use a tight
  // ±0.000001° window to be safe against trailing-precision artefacts.
  const EPS = 0.000001
  const candidates = await prisma.locationEvent.findMany({
    where: {
      labelId: label.id,
      latitude: { gte: label.lastLatitude - EPS, lte: label.lastLatitude + EPS },
      longitude: { gte: label.lastLongitude - EPS, lte: label.lastLongitude + EPS },
      excludedReason: null,
    },
    orderBy: { recordedAt: 'desc' },
    select: { id: true, recordedAt: true, source: true, geocodedCity: true },
  })

  if (candidates.length === 0) {
    console.log('No matching LocationEvents — nothing to exclude.')
    return
  }

  // Correlate with WebhookLog. Build a set of timestamps that came in via a
  // 'location'-type webhook for this iccid — those LocationEvents are genuine
  // even if the coord happens to match the cache.
  const genuineTimestamps = new Set<number>()
  if (label.iccid) {
    const locationLogs = await prisma.webhookLog.findMany({
      where: { iccid: label.iccid, eventType: 'location' },
      select: { body: true },
    })
    for (const log of locationLogs) {
      const time = (log.body as Record<string, unknown>)?.time
      if (typeof time === 'string') {
        const t = new Date(time).getTime()
        if (Number.isFinite(t)) genuineTimestamps.add(t)
      }
    }
  }

  const phantomIds: string[] = []
  const keptIds: string[] = []
  for (const e of candidates) {
    if (genuineTimestamps.has(e.recordedAt.getTime())) {
      keptIds.push(e.id)
    } else {
      phantomIds.push(e.id)
    }
  }

  console.log(`\nCandidate LocationEvent(s) at exact cached coords: ${candidates.length}`)
  console.log(`  most recent: ${candidates[0].recordedAt.toISOString()} (${candidates[0].geocodedCity ?? '-'})`)
  console.log(`  oldest:      ${candidates[candidates.length - 1].recordedAt.toISOString()}`)
  console.log(`Genuine 'location'-type webhooks for ${label.iccid}: ${genuineTimestamps.size}`)
  console.log(`  → keep ${keptIds.length} event(s) that match a genuine webhook`)
  console.log(`  → exclude ${phantomIds.length} phantom event(s)`)

  if (phantomIds.length === 0) {
    console.log('\nNothing to exclude.')
    return
  }

  console.log(`\nWill also clear label.lastLatitude/lastLongitude/lastAccuracy.`)

  if (DRY_RUN) {
    console.log(`\nPass --apply to execute.`)
    return
  }

  // Soft-exclude phantoms in batches
  for (let i = 0; i < phantomIds.length; i += 100) {
    const batch = phantomIds.slice(i, i + 100)
    await prisma.locationEvent.updateMany({
      where: { id: { in: batch } },
      data: { excludedReason: EXCLUSION_REASON },
    })
  }

  // Clear label cache so the (now-fixed) handler doesn't re-use bad coords
  await prisma.label.update({
    where: { id: label.id },
    data: {
      lastLatitude: null,
      lastLongitude: null,
      lastAccuracy: null,
    },
  })

  console.log(`\n✓ Excluded ${phantomIds.length} phantom events with reason="${EXCLUSION_REASON}"`)
  console.log(`✓ Kept ${keptIds.length} genuine 'location'-webhook event(s) at the same coords`)
  console.log(`✓ Cleared label.lastLatitude/lastLongitude/lastAccuracy`)
  console.log(`\nNext genuine 'location'-type webhook will populate fresh coords.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
