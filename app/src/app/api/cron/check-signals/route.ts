import { db } from '@/lib/db'
import { sendNoSignalNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'

const DEFAULT_NO_SIGNAL_HOURS = 48

/**
 * GET /api/cron/check-signals
 *
 * Sends a single "no signal" email per silent period for each active cargo
 * tracking shipment whose label has gone quiet for longer than the org's
 * configured threshold (default 48h, configurable via OrgSettings.noSignalHours).
 *
 * LABEL_DISPATCH shipments are excluded — "no signal" copy is cargo-specific
 * (shielded container / cellular dead zone) and dispatches rely on the courier
 * rather than our own label reporting.
 *
 * Dedup rule: we skip a label if the most recent no_signal notification was
 * sent at or after the label's current lastSeenAt. That gives exactly-one
 * email per silent period with passive recovery — when a webhook arrives, it
 * bumps lastSeenAt past the old sentAt, so if the label goes silent again a
 * fresh alert will fire on the next silent period.
 */
export const GET = withCronLogging('check-signals', async () => {
  const now = Date.now()

  const shipments = await db.shipment.findMany({
    where: {
      type: 'CARGO_TRACKING',
      status: 'IN_TRANSIT',
      labelId: { not: null },
      label: { status: 'ACTIVE' },
    },
    select: {
      id: true,
      userId: true,
      orgId: true,
      name: true,
      shareCode: true,
      createdAt: true,
      label: {
        select: {
          id: true,
          deviceId: true,
          lastSeenAt: true,
          activatedAt: true,
        },
      },
    },
  })

  // Bulk-load per-org thresholds in a single query.
  const orgIds = [
    ...new Set(
      shipments.map((s) => s.orgId).filter((id): id is string => !!id)
    ),
  ]
  const orgSettings = orgIds.length
    ? await db.orgSettings.findMany({
        where: { orgId: { in: orgIds } },
        select: { orgId: true, noSignalHours: true },
      })
    : []
  const thresholdByOrg = new Map(
    orgSettings.map((s) => [s.orgId, s.noSignalHours])
  )

  let notificationsSent = 0
  let skippedUnderThreshold = 0
  let skippedAlreadyAlerted = 0

  for (const shipment of shipments) {
    if (!shipment.label) continue

    const thresholdHours =
      (shipment.orgId ? thresholdByOrg.get(shipment.orgId) : undefined) ??
      DEFAULT_NO_SIGNAL_HOURS
    const thresholdMs = thresholdHours * 60 * 60 * 1000

    // lastSeenAt is bumped on EVERY webhook (incl. deduped, non-location) by
    // the Onomondo handler, so it is the authoritative heartbeat. Fall back
    // to activatedAt / createdAt if null (shouldn't happen for an ACTIVE
    // in-transit label, but be defensive).
    const effectiveLastSeen =
      shipment.label.lastSeenAt ??
      shipment.label.activatedAt ??
      shipment.createdAt

    if (now - effectiveLastSeen.getTime() < thresholdMs) {
      skippedUnderThreshold++
      continue
    }

    // One email per silent period. If the most recent no_signal notification
    // for this shipment was sent at or after the current lastSeenAt, the
    // label has had no activity since our alert — don't spam. When the label
    // recovers (any webhook bumps lastSeenAt past sentAt), the next silent
    // period will naturally pass this check and re-alert.
    const lastAlert = await db.notification.findFirst({
      where: {
        type: 'no_signal',
        message: { contains: shipment.id },
        ...(shipment.orgId
          ? { orgId: shipment.orgId }
          : { userId: shipment.userId, orgId: null }),
      },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    })

    if (lastAlert && lastAlert.sentAt >= effectiveLastSeen) {
      skippedAlreadyAlerted++
      continue
    }

    // Only now do we fetch the latest LocationEvent (for the email's "last
    // known location"). Candidate-but-quiet labels skip this query.
    const latestLocation = await db.locationEvent.findFirst({
      where: { labelId: shipment.label.id },
      orderBy: { recordedAt: 'desc' },
      select: { latitude: true, longitude: true },
    })

    await sendNoSignalNotification({
      userId: shipment.userId,
      orgId: shipment.orgId,
      shipmentId: shipment.id,
      shipmentName: shipment.name || 'Unnamed Shipment',
      deviceId: shipment.label.deviceId,
      shareCode: shipment.shareCode,
      lastSeenAt: effectiveLastSeen,
      thresholdHours,
      lastLocation: latestLocation
        ? { lat: latestLocation.latitude, lng: latestLocation.longitude }
        : undefined,
    })

    notificationsSent++
  }

  return {
    checked: shipments.length,
    notificationsSent,
    skippedUnderThreshold,
    skippedAlreadyAlerted,
    orgsWithCustomThreshold: thresholdByOrg.size,
  }
})
