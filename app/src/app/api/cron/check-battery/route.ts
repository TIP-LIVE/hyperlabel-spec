import { db } from '@/lib/db'
import { sendLowBatteryNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'

/**
 * GET /api/cron/check-battery
 * Cron job to check for low battery labels
 */
export const GET = withCronLogging('check-battery', async () => {
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

      // Check if we already sent this threshold notification for this
      // shipment — scoped to the org when present, else the owning user.
      const recentNotification = await db.notification.findFirst({
        where: {
          type: 'low_battery',
          sentAt: { gte: oneDayAgo },
          AND: [
            { message: { contains: threshold } },
            { message: { contains: shipment.id } },
          ],
          ...(shipment.orgId
            ? { orgId: shipment.orgId }
            : { userId: shipment.userId, orgId: null }),
        },
      })

      if (recentNotification) continue

      await sendLowBatteryNotification({
        userId: shipment.userId,
        orgId: shipment.orgId,
        shipmentId: shipment.id,
        shipmentName: shipment.name || 'Unnamed Shipment',
        deviceId: label.deviceId,
        shareCode: shipment.shareCode,
        batteryLevel: label.batteryPct!,
      })

      notificationsSent++
    }
  }

  return { checked: labelsWithLowBattery.length, notificationsSent }
})
