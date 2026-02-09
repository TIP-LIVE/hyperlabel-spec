import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendNoSignalNotification } from '@/lib/notifications'

// Cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/check-signals
 * Cron job to check for labels that haven't reported in 24h
 * Should be called via Vercel Cron or external cron service
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Find active labels with shipments that haven't reported recently
    const shipmentsWithSilentLabels = await db.shipment.findMany({
      where: {
        status: 'IN_TRANSIT',
        label: {
          status: 'ACTIVE',
          locations: {
            none: {
              recordedAt: { gte: twentyFourHoursAgo },
            },
          },
        },
      },
      include: {
        user: { select: { id: true } },
        label: {
          select: {
            deviceId: true,
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    let notificationsSent = 0

    for (const shipment of shipmentsWithSilentLabels) {
      const lastLocation = shipment.label.locations[0]

      // Check if we already sent a no-signal notification in the last 24h
      const recentNotification = await db.notification.findFirst({
        where: {
          userId: shipment.userId,
          type: 'no_signal',
          sentAt: { gte: twentyFourHoursAgo },
          message: { contains: shipment.id },
        },
      })

      if (recentNotification) continue

      await sendNoSignalNotification({
        userId: shipment.userId,
        shipmentName: shipment.name || 'Unnamed Shipment',
        deviceId: shipment.label.deviceId,
        shareCode: shipment.shareCode,
        lastSeenAt: lastLocation?.recordedAt || shipment.createdAt,
        lastLocation: lastLocation
          ? { lat: lastLocation.latitude, lng: lastLocation.longitude }
          : undefined,
      })

      notificationsSent++
    }

    return NextResponse.json({
      success: true,
      checked: shipmentsWithSilentLabels.length,
      notificationsSent,
    })
  } catch (error) {
    console.error('Error checking signals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
