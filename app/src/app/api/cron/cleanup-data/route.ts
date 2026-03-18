import { db } from '@/lib/db'
import { withCronLogging } from '@/lib/cron'

// Retention period: 90 days after delivery for location events
const RETENTION_DAYS = 90
// Retention for notifications: 30 days
const NOTIFICATION_RETENTION_DAYS = 30
// Retention for cron execution logs: 30 days
const CRON_LOG_RETENTION_DAYS = 30

/**
 * GET /api/cron/cleanup-data
 * Cron job to clean up old location events, notifications, and cron logs
 * per data retention policy.
 *
 * Per spec §5.6:
 * - Location events: deleted 90 days after shipment delivery
 * - Read notifications: deleted after 30 days
 * - Cron execution logs: deleted after 30 days
 */
export const GET = withCronLogging('cleanup-data', async () => {
  const retentionCutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const notificationCutoff = new Date(
    Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000
  )
  const cronLogCutoff = new Date(Date.now() - CRON_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)

  // 1. Find delivered shipments older than retention period
  const expiredShipments = await db.shipment.findMany({
    where: {
      status: 'DELIVERED',
      deliveredAt: { lte: retentionCutoff },
    },
    select: { id: true },
  })

  const shipmentIds = expiredShipments.map((s) => s.id)

  // Delete location events for expired shipments
  let locationsDeleted = 0
  if (shipmentIds.length > 0) {
    const result = await db.locationEvent.deleteMany({
      where: {
        shipmentId: { in: shipmentIds },
      },
    })
    locationsDeleted = result.count
  }

  // 2. Delete old read notifications
  const notificationResult = await db.notification.deleteMany({
    where: {
      read: true,
      sentAt: { lte: notificationCutoff },
    },
  })

  // 3. Also delete unread notifications older than 90 days (safety net)
  const oldNotificationResult = await db.notification.deleteMany({
    where: {
      sentAt: { lte: retentionCutoff },
    },
  })

  // 4. Disable share links for long-expired delivered shipments (90+ days)
  let sharesDisabled = 0
  if (shipmentIds.length > 0) {
    const shareResult = await db.shipment.updateMany({
      where: {
        id: { in: shipmentIds },
        shareEnabled: true,
      },
      data: { shareEnabled: false },
    })
    sharesDisabled = shareResult.count
  }

  // 5. Clean up old cron execution logs
  const cronLogsResult = await db.cronExecutionLog.deleteMany({
    where: {
      startedAt: { lte: cronLogCutoff },
    },
  })

  return {
    expiredShipments: shipmentIds.length,
    locationsDeleted,
    notificationsDeleted: notificationResult.count + oldNotificationResult.count,
    sharesDisabled,
    cronLogsDeleted: cronLogsResult.count,
  }
})
