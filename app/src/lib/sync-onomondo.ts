import { getOnomonodoSimByIccid, getSimLocation } from '@/lib/onomondo'
import { processLocationReport, LocationReportError } from '@/lib/device-report'
import { db } from '@/lib/db'

/** Throttle map: labelId → last sync attempt timestamp */
const syncThrottle = new Map<string, number>()

/** Minimum gap between sync attempts for the same label. */
const THROTTLE_MS = 2 * 60 * 1000 // 2 minutes

/** Minimum gap between the Onomondo timestamp and our latest event to avoid duplicates. */
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Poll Onomondo for the latest location of a single label and create
 * a LocationEvent if the data is newer than what we already have.
 *
 * Designed to be called on-demand (e.g. when a user views a shipment)
 * as well as from the cron job. Includes an in-memory throttle so
 * rapid client polling (every 30 s) doesn't hammer the Onomondo API.
 *
 * Returns true if a new location was synced, false if skipped/throttled.
 */
export async function syncLabelLocation(label: {
  id: string
  iccid: string | null
  deviceId: string
}): Promise<boolean> {
  if (!label.iccid) {
    console.info(`[sync-onomondo] skip ${label.deviceId}: no ICCID`)
    return false
  }

  // Throttle: skip if we already attempted recently
  const lastAttempt = syncThrottle.get(label.id)
  if (lastAttempt && Date.now() - lastAttempt < THROTTLE_MS) {
    console.info(`[sync-onomondo] throttled ${label.deviceId}: last attempt ${Math.round((Date.now() - lastAttempt) / 1000)}s ago`)
    return false
  }
  syncThrottle.set(label.id, Date.now())

  try {
    const sim = await getOnomonodoSimByIccid(label.iccid)
    if (!sim) {
      console.warn(`[sync-onomondo] SIM not found for ICCID ${label.iccid} (${label.deviceId})`)
      return false
    }

    const loc = await getSimLocation(sim.id)
    if (!loc) {
      console.warn(`[sync-onomondo] no location from Onomondo for ${label.deviceId} (SIM ${sim.id})`)
      return false
    }

    // Dedup: skip if Onomondo timestamp is not newer than our latest event
    const latest = await db.locationEvent.findFirst({
      where: { labelId: label.id },
      orderBy: { recordedAt: 'desc' },
      select: { recordedAt: true },
    })

    const onomondoTime = new Date(loc.time)
    if (
      latest &&
      onomondoTime.getTime() - latest.recordedAt.getTime() < DEDUP_WINDOW_MS
    ) {
      const gapMin = Math.round((onomondoTime.getTime() - latest.recordedAt.getTime()) / 60_000)
      console.info(`[sync-onomondo] dedup skip ${label.deviceId}: onomondo=${onomondoTime.toISOString()} latest=${latest.recordedAt.toISOString()} gap=${gapMin}min (need >${Math.round(DEDUP_WINDOW_MS / 60_000)}min)`)
      return false
    }

    await processLocationReport({
      iccid: label.iccid,
      cellLatitude: loc.lat,
      cellLongitude: loc.lng,
      accuracy: loc.accuracy,
      recordedAt: loc.time,
      source: 'CELL_TOWER',
    })

    console.info(`[sync-onomondo] synced location for ${label.deviceId}`, {
      lat: loc.lat,
      lng: loc.lng,
      time: loc.time,
    })
    return true
  } catch (err) {
    if (err instanceof LocationReportError) {
      console.warn(`[sync-onomondo] report error for ${label.deviceId}: ${err.message}`)
    } else {
      console.error(`[sync-onomondo] unexpected error for ${label.deviceId}:`, err)
    }
    return false
  }
}
