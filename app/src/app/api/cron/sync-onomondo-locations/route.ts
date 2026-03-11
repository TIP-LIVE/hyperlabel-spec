import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncLabelLocation } from '@/lib/sync-onomondo'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/sync-onomondo-locations
 *
 * Polls Onomondo for the latest SIM location of every label that has an
 * active shipment (PENDING or IN_TRANSIT). Creates a LocationEvent when
 * the Onomondo-reported location is newer than our latest record.
 *
 * Schedule: daily (Vercel Hobby plan limit)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[sync-onomondo] cron 401: missing or invalid CRON_SECRET')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find all labels with ICCID that have active shipments
    const activeLabels = await db.label.findMany({
      where: {
        iccid: { not: null },
        status: 'ACTIVE',
        OR: [
          { shipments: { some: { status: { in: ['PENDING', 'IN_TRANSIT'] } } } },
          { shipmentLabels: { some: { shipment: { status: { in: ['PENDING', 'IN_TRANSIT'] } } } } },
        ],
      },
      select: {
        id: true,
        deviceId: true,
        iccid: true,
      },
    })

    console.info(`[sync-onomondo] cron started: ${activeLabels.length} active labels`, {
      labels: activeLabels.map((l) => l.deviceId),
    })

    let synced = 0
    let skipped = 0
    let failed = 0

    for (const label of activeLabels) {
      try {
        const didSync = await syncLabelLocation(label)
        if (didSync) {
          synced++
        } else {
          skipped++
        }
      } catch (err) {
        failed++
        console.error(`[sync-onomondo] cron: label ${label.deviceId} failed:`, err)
      }
    }

    console.info(`[sync-onomondo] cron finished: synced=${synced} skipped=${skipped} failed=${failed}`)

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
