import { db } from '@/lib/db'
import { sendShareLinkReminderNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'

/**
 * GET /api/cron/check-reminders
 * Cron job to send share link reminders to users with labels that are
 * SOLD (purchased but not yet used in a shipment) for more than 7 days.
 *
 * Also reminds users whose CARGO_TRACKING shipment has been PENDING (label
 * linked, no location signal) past an effective readiness threshold. The
 * clock starts from the later of the cargo shipment creation and the linked
 * LABEL_DISPATCH delivery — we don't nag while labels are still physically
 * in transit to the receiver. Capped at two reminders per shipment (at
 * D+7 and D+14) to avoid turning a slow route into a daily drumbeat.
 */
const PENDING_FIRST_REMINDER_DAYS = 7
const PENDING_SECOND_REMINDER_DAYS = 14
const PENDING_MAX_REMINDERS = 2

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)
}

export const GET = withCronLogging('check-reminders', async () => {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

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

  // 2. PENDING cargo shipments with no location signal. The 7-day clock starts
  // from max(cargo createdAt, linked dispatch deliveredAt) so we don't nag
  // while labels are still in transit to the receiver.
  // Note: LABEL_DISPATCH PENDING shipments are handled by check-stale-dispatches.
  const candidateShipments = await db.shipment.findMany({
    where: {
      type: 'CARGO_TRACKING',
      status: 'PENDING',
      // Fastest filter: can't possibly trip even the first threshold until the
      // cargo shipment itself is ≥ 7 days old. Anything younger is not yet a
      // candidate even if the dispatch was delivered long ago.
      createdAt: { lte: sevenDaysAgo },
    },
    include: {
      label: {
        select: {
          id: true,
          deviceId: true,
          shipmentLabels: {
            where: { shipment: { type: 'LABEL_DISPATCH' } },
            orderBy: { shipment: { createdAt: 'desc' } },
            take: 1,
            select: {
              shipment: {
                select: {
                  status: true,
                  deliveredAt: true,
                  receiverFirstName: true,
                  receiverLastName: true,
                  destinationName: true,
                  destinationCountry: true,
                },
              },
            },
          },
        },
      },
    },
  })

  let skippedInTransit = 0
  let skippedMaxReminders = 0
  let skippedBelowThreshold = 0

  for (const shipment of candidateShipments) {
    if (!shipment.label) continue

    const dispatch = shipment.label.shipmentLabels[0]?.shipment ?? null

    // If a dispatch exists and hasn't been delivered or cancelled yet,
    // the labels are still physically in transit — suppress the nag.
    if (dispatch && dispatch.status !== 'DELIVERED' && dispatch.status !== 'CANCELLED') {
      skippedInTransit++
      continue
    }

    // Effective readiness = later of cargo creation and dispatch delivery.
    // Dispatch may be DELIVERED without a deliveredAt stamp on legacy rows;
    // fall back to cargo createdAt in that case.
    const effectiveReadyAt =
      dispatch?.status === 'DELIVERED' && dispatch.deliveredAt && dispatch.deliveredAt > shipment.createdAt
        ? dispatch.deliveredAt
        : shipment.createdAt

    const daysSinceReady = daysBetween(effectiveReadyAt, now)

    // Count prior reminders for this shipment by matching shareCode inside
    // the stored notification metadata JSON. Caps lifetime reminders at 2.
    const priorReminderCount = await db.notification.count({
      where: {
        userId: shipment.userId,
        type: 'pending_shipment_reminder',
        message: { contains: `"shipmentId":"${shipment.shareCode}"` },
      },
    })

    if (priorReminderCount >= PENDING_MAX_REMINDERS) {
      skippedMaxReminders++
      continue
    }

    const requiredDays =
      priorReminderCount === 0 ? PENDING_FIRST_REMINDER_DAYS : PENDING_SECOND_REMINDER_DAYS

    if (daysSinceReady < requiredDays) {
      skippedBelowThreshold++
      continue
    }

    // Belt-and-braces: don't send twice in the same 24h window even if the
    // per-shipment cap logic is momentarily inconsistent.
    const recentReminder = await db.notification.findFirst({
      where: {
        userId: shipment.userId,
        type: 'pending_shipment_reminder',
        sentAt: { gte: oneDayAgo },
        message: { contains: `"shipmentId":"${shipment.shareCode}"` },
      },
    })

    if (recentReminder) continue

    const receiverName = [dispatch?.receiverFirstName, dispatch?.receiverLastName]
      .filter(Boolean)
      .join(' ') || dispatch?.destinationName || null

    await sendShareLinkReminderNotification({
      userId: shipment.userId,
      reminderType: 'pending_shipment',
      shipmentName: shipment.name || 'Unnamed Shipment',
      shareCode: shipment.shareCode,
      deviceIds: [shipment.label.deviceId],
      daysSinceReady: Math.floor(daysSinceReady),
      dispatchDelivered: dispatch?.status === 'DELIVERED',
      dispatchDeliveredAt: dispatch?.deliveredAt ?? null,
      receiverName,
    })

    remindersSent++
  }

  return {
    unusedLabelUsers: unusedByUser.size,
    candidateShipments: candidateShipments.length,
    skippedInTransit,
    skippedMaxReminders,
    skippedBelowThreshold,
    remindersSent,
  }
})
