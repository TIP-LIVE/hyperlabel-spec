import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendLowBatteryNotification } from '@/lib/notifications'

// Cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/check-battery
 * Cron job to check for low battery labels
 * Should be called via Vercel Cron or external cron service
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find active labels with low battery that have shipments
    const labelsWithLowBattery = await db.label.findMany({
      where: {
        status: 'ACTIVE',
        batteryPct: { lte: 20, gt: 0 },
      },
      include: {
        shipments: {
          where: { status: 'IN_TRANSIT' },
          include: {
            user: { select: { id: true } },
          },
        },
      },
    })

    let notificationsSent = 0
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    for (const label of labelsWithLowBattery) {
      for (const shipment of label.shipments) {
        // Check threshold: send at 20% and 10%
        const threshold = label.batteryPct! <= 10 ? 'critical_10' : 'warning_20'

        // Check if we already sent this threshold notification
        const recentNotification = await db.notification.findFirst({
          where: {
            userId: shipment.userId,
            type: 'low_battery',
            sentAt: { gte: oneDayAgo },
            message: { contains: threshold },
          },
        })

        if (recentNotification) continue

        await sendLowBatteryNotification({
          userId: shipment.userId,
          shipmentName: shipment.name || 'Unnamed Shipment',
          deviceId: label.deviceId,
          shareCode: shipment.shareCode,
          batteryLevel: label.batteryPct!,
        })

        notificationsSent++
      }
    }

    return NextResponse.json({
      success: true,
      checked: labelsWithLowBattery.length,
      notificationsSent,
    })
  } catch (error) {
    console.error('Error checking battery:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
