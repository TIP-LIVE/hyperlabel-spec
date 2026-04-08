import { db } from '@/lib/db'
import { sendShareLinkReminderNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'

/**
 * GET /api/cron/check-reminders
 * Cron job to send share link reminders to users with labels that are
 * SOLD (purchased but not yet used in a shipment) for more than 7 days.
 * Also reminds users who have PENDING shipments (created but not yet in transit)
 * for more than 3 days.
 */
export const GET = withCronLogging('check-reminders', async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  let remindersSent = 0

  const unusedLabels = await db.label.findMany({
    where: {
      status: 'SOLD',
      orderLabels: {
        some: {
          order: {
            status: { in: ['SHIPPED', 'DELIVERED'] },
            shippedAt: { lte: sevenDaysAgo },
          },
        },
      },
      shipments: { none: {} },
    },
    include: {
      orderLabels: {
        include: {
          order: { select: { userId: true, shippedAt: true } },
        },
      },
    },
  })

  const unusedByUser = new Map<string, typeof unusedLabels>()
  for (const label of unusedLabels) {
    const firstOrder = label.orderLabels[0]?.order
    if (!firstOrder) continue
    const userId = firstOrder.userId
    if (!unusedByUser.has(userId)) {
      unusedByUser.set(userId, [])
    }
    unusedByUser.get(userId)!.push(label)
  }

  for (const [userId, labels] of unusedByUser) {
    // Check if we already sent a reminder in the last 24h
    const recentReminder = await db.notification.findFirst({
      where: {
        userId,
        type: 'unused_label_reminder',
        sentAt: { gte: oneDayAgo },
      },
    })

    if (recentReminder) continue

    await sendShareLinkReminderNotification({
      userId,
      reminderType: 'unused_labels',
      labelCount: labels.length,
      deviceIds: labels.map((l) => l.deviceId),
    })

    remindersSent++
  }

  // 2. Find PENDING cargo shipments older than 3 days (label linked but no movement)
  // Note: LABEL_DISPATCH PENDING shipments are handled by check-stale-dispatches.
  const staleShipments = await db.shipment.findMany({
    where: {
      type: 'CARGO_TRACKING',
      status: 'PENDING',
      createdAt: { lte: threeDaysAgo },
    },
    include: {
      label: { select: { deviceId: true } },
    },
  })

  for (const shipment of staleShipments) {
    if (!shipment.label) continue

    // Check if we already sent a reminder in the last 24h
    const recentReminder = await db.notification.findFirst({
      where: {
        userId: shipment.userId,
        type: 'pending_shipment_reminder',
        sentAt: { gte: oneDayAgo },
        message: { contains: shipment.id },
      },
    })

    if (recentReminder) continue

    await sendShareLinkReminderNotification({
      userId: shipment.userId,
      reminderType: 'pending_shipment',
      shipmentName: shipment.name || 'Unnamed Shipment',
      shareCode: shipment.shareCode,
      deviceIds: [shipment.label.deviceId],
    })

    remindersSent++
  }

  return {
    unusedLabelUsers: unusedByUser.size,
    staleShipments: staleShipments.length,
    remindersSent,
  }
})
