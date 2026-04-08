import { db } from '@/lib/db'
import { sendNoSignalNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'

/**
 * GET /api/cron/check-signals
 * Cron job to check for labels that haven't reported in 48h
 */
export const GET = withCronLogging('check-signals', async () => {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

  // Find active cargo labels with shipments that haven't reported recently.
  // LABEL_DISPATCH shipments are excluded — "no signal" copy is cargo-specific
  // (shielded container / cellular dead zone), and dispatches rely on the
  // courier rather than our own label reporting.
  const shipmentsWithSilentLabels = await db.shipment.findMany({
    where: {
      type: 'CARGO_TRACKING',
      status: 'IN_TRANSIT',
      labelId: { not: null },
      label: {
        status: 'ACTIVE',
        locations: {
          none: {
            recordedAt: { gte: fortyEightHoursAgo },
          },
        },
      },
    },
    include: {
      user: { select: { id: true } },
      // orgId already selected by default (scalar field on Shipment)
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
    if (!shipment.label) continue
    const lastLocation = shipment.label.locations[0]

    // Check if we already sent a no-signal notification in the last 48h for
    // this shipment — scoped to the org when present, else the owning user.
    const recentNotification = await db.notification.findFirst({
      where: {
        type: 'no_signal',
        sentAt: { gte: fortyEightHoursAgo },
        message: { contains: shipment.id },
        ...(shipment.orgId
          ? { orgId: shipment.orgId }
          : { userId: shipment.userId, orgId: null }),
      },
    })

    if (recentNotification) continue

    await sendNoSignalNotification({
      userId: shipment.userId,
      orgId: shipment.orgId,
      shipmentId: shipment.id,
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

  return { checked: shipmentsWithSilentLabels.length, notificationsSent }
})
