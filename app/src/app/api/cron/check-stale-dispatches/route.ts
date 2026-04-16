import { db } from '@/lib/db'
import { withCronLogging } from '@/lib/cron'

/**
 * GET /api/cron/check-stale-dispatches
 *
 * Handles LABEL_DISPATCH shipments that were created with blank receiver
 * details and never got filled in:
 *   - Day 7 after creation: log a reminder signal (email hook is TODO)
 *   - Past shareLinkExpiresAt (day 14+): mark the dispatch as CANCELLED
 *     so the labels are released back to the user.
 *
 * Runs daily.
 */
export const GET = withCronLogging('check-stale-dispatches', async () => {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

  let remindersLogged = 0
  let cancelled = 0

  // 1. Day-7 reminder window: dispatches 7-8 days old with no receiver details
  const needReminder = await db.shipment.findMany({
    where: {
      type: 'LABEL_DISPATCH',
      status: 'PENDING',
      addressSubmittedAt: null,
      shareLinkExpiresAt: { not: null },
      createdAt: { gte: eightDaysAgo, lte: sevenDaysAgo },
    },
    select: { id: true, name: true, shareCode: true, userId: true },
  })

  for (const dispatch of needReminder) {
    // TODO: wire up a dispatch-specific reminder email here.
    // For now, log so the watchdog cron picks it up.
    console.info('[check-stale-dispatches] day-7 reminder due', {
      dispatchId: dispatch.id,
      name: dispatch.name,
      shareCode: dispatch.shareCode,
    })
    remindersLogged++
  }

  // 2. Expired dispatches: past shareLinkExpiresAt and still unsubmitted → cancel
  const expired = await db.shipment.findMany({
    where: {
      type: 'LABEL_DISPATCH',
      status: 'PENDING',
      addressSubmittedAt: null,
      shareLinkExpiresAt: { lt: now },
    },
    select: { id: true, name: true },
  })

  for (const dispatch of expired) {
    await db.shipment.update({
      where: { id: dispatch.id },
      data: { status: 'CANCELLED' },
    })
    console.info('[check-stale-dispatches] cancelled expired dispatch', {
      dispatchId: dispatch.id,
      name: dispatch.name,
    })
    cancelled++
  }

  return {
    remindersLogged,
    cancelled,
    scanned: needReminder.length + expired.length,
  }
})
