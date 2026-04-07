import { db } from '@/lib/db'
import { withCronLogging } from '@/lib/cron'
import {
  listUtecDevices,
  getUtecLatest,
  indexByIccid,
  UtecAuthError,
} from '@/lib/utec-client'

/**
 * GET /api/cron/sync-utec-battery
 *
 * Polls label.utec.ua every 2 hours to backfill battery percentage on our
 * labels. Location data is NOT imported — Onomondo's location-update webhook
 * remains the only source of truth for coordinates.
 *
 * Why this exists: TIP only receives SIM-level network events from Onomondo
 * (cell tower registrations, no battery). The actual firmware data (including
 * battery voltage) lives on label.utec.ua. Their tip_forwarder.py is supposed
 * to push it to us, but it short-circuits when `device.tip_device_id` is
 * null — which is the case for most labels. Rather than wait for them to
 * provision every new label, we pull on a schedule.
 *
 * Requires env var UTEC_API_TOKEN (non-expiring Google-OAuth-issued JWT).
 * If missing, the cron logs a warning and exits cleanly — does not error.
 */
export const GET = withCronLogging('sync-utec-battery', async () => {
  const token = process.env.UTEC_API_TOKEN
  if (!token) {
    console.warn('[sync-utec-battery] UTEC_API_TOKEN not set — skipping')
    return { skipped: 'no_token', updated: 0, checked: 0 }
  }

  // Only poll labels that could plausibly have battery data:
  // anything with an iccid. Includes SOLD/ACTIVE/DELIVERED — battery is
  // useful across all lifecycle states.
  const labels = await db.label.findMany({
    where: { iccid: { not: null } },
    select: { id: true, deviceId: true, iccid: true, batteryPct: true },
  })

  if (labels.length === 0) {
    return { checked: 0, updated: 0, notFound: 0 }
  }

  // Fetch the full device list once, then look up each label by iccid.
  // label.utec.ua uses an integer primary key, so we can't query by iccid
  // directly.
  let devices
  try {
    devices = await listUtecDevices(token)
  } catch (err) {
    if (err instanceof UtecAuthError) {
      console.error('[sync-utec-battery]', err.message)
      return { error: 'auth_failed', updated: 0, checked: 0 }
    }
    throw err
  }

  const iccidToUtecId = indexByIccid(devices)

  let updated = 0
  let unchanged = 0
  let notFound = 0
  let failed = 0

  for (const label of labels) {
    const utecId = label.iccid ? iccidToUtecId.get(label.iccid) : undefined
    if (!utecId) {
      notFound++
      continue
    }

    try {
      const latest = await getUtecLatest(token, utecId)
      const battery = latest?.battery

      if (battery == null) {
        unchanged++
        continue
      }

      // Clamp to 0-100 in case their conversion ever produces out-of-range
      // values. Round to an integer — our column is an Int.
      const pct = Math.max(0, Math.min(100, Math.round(battery)))

      if (pct === label.batteryPct) {
        unchanged++
        continue
      }

      await db.label.update({
        where: { id: label.id },
        data: { batteryPct: pct },
      })
      updated++
    } catch (err) {
      if (err instanceof UtecAuthError) throw err // bail out immediately
      failed++
      console.warn(
        `[sync-utec-battery] ${label.deviceId} (${label.iccid}) failed:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  return {
    checked: labels.length,
    updated,
    unchanged,
    notFound,
    failed,
    utecDevices: devices.length,
  }
})
