import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOnomonodoSimByIccid, getSimLocation } from '@/lib/onomondo'
import { processLocationReport, LocationReportError } from '@/lib/device-report'

const CRON_SECRET = process.env.CRON_SECRET

/** Minimum gap (ms) between the Onomondo timestamp and our latest event to avoid duplicates. */
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * GET /api/cron/sync-onomondo-locations
 *
 * Polls Onomondo for the latest SIM location of every label that has an
 * active shipment (PENDING or IN_TRANSIT). Creates a LocationEvent when
 * the Onomondo-reported location is newer than our latest record.
 *
 * Schedule: every 15 minutes
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find all labels with ICCID that have active shipments
    const activeLabels = await db.label.findMany({
      where: {
        iccid: { not: null },
        status: 'ACTIVE',
        shipments: {
          some: {
            status: { in: ['PENDING', 'IN_TRANSIT'] },
          },
        },
      },
      select: {
        id: true,
        deviceId: true,
        iccid: true,
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
          select: { recordedAt: true },
        },
      },
    })

    let synced = 0
    let skipped = 0
    let failed = 0

    for (const label of activeLabels) {
      if (!label.iccid) continue

      try {
        // Look up the Onomondo SIM ID
        const sim = await getOnomonodoSimByIccid(label.iccid)
        if (!sim) {
          console.warn(
            `[sync-onomondo] SIM not found for ICCID ${label.iccid} (${label.deviceId})`
          )
          skipped++
          continue
        }

        // Fetch the latest location from Onomondo
        const loc = await getSimLocation(sim.id)
        if (!loc) {
          skipped++
          continue
        }

        // Deduplicate: skip if we already have a recent LocationEvent
        const latestRecordedAt = label.locations[0]?.recordedAt
        const onomondoTime = new Date(loc.time)

        if (
          latestRecordedAt &&
          onomondoTime.getTime() - latestRecordedAt.getTime() < DEDUP_WINDOW_MS
        ) {
          skipped++
          continue
        }

        // Create a new LocationEvent via the shared pipeline
        await processLocationReport({
          iccid: label.iccid,
          cellLatitude: loc.lat,
          cellLongitude: loc.lng,
          accuracy: loc.accuracy,
          recordedAt: loc.time,
          source: 'CELL_TOWER',
        })

        synced++
        console.info(
          `[sync-onomondo] synced location for ${label.deviceId}`,
          { lat: loc.lat, lng: loc.lng, time: loc.time }
        )
      } catch (err) {
        if (err instanceof LocationReportError) {
          console.warn(
            `[sync-onomondo] report error for ${label.deviceId}: ${err.message}`
          )
        } else {
          console.error(
            `[sync-onomondo] unexpected error for ${label.deviceId}:`,
            err
          )
        }
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      labels: activeLabels.length,
      synced,
      skipped,
      failed,
    })
  } catch (error) {
    console.error('[sync-onomondo] cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
