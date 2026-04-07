import { db } from '@/lib/db'
import { generateShareCode } from '@/lib/utils/share-code'
import { sendAutoShipmentCreatedNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'

/**
 * GET /api/cron/check-unclaimed-labels
 *
 * Cron job to auto-create shipments for labels that were physically activated
 * but not claimed within the 24-hour window.
 *
 * For each unclaimed label:
 * 1. Creates a CARGO_TRACKING shipment with a default name
 * 2. Backfills all orphaned location events to the new shipment
 * 3. Clears the claim token
 * 4. Notifies the label purchaser
 */
export const GET = withCronLogging('check-unclaimed-labels', async () => {
  // Find labels with expired claim windows and no active shipment
  const unclaimedLabels = await db.label.findMany({
    where: {
      claimToken: { not: null },
      claimExpiresAt: { lt: new Date() },
      // No active shipment linked
      shipments: {
        none: {
          status: { in: ['PENDING', 'IN_TRANSIT'] },
        },
      },
    },
    include: {
      orderLabels: {
        include: {
          order: {
            select: { userId: true, orgId: true },
          },
        },
        take: 1,
      },
      _count: {
        select: { locations: true },
      },
    },
  })

  let shipmentsCreated = 0

  for (const label of unclaimedLabels) {
    const orderLabel = label.orderLabels[0]
    if (!orderLabel) {
      // No owner found — clear claim token and skip
      await db.label.update({
        where: { id: label.id },
        data: { claimToken: null, claimExpiresAt: null },
      })
      continue
    }

    const ownerId = orderLabel.order.userId
    const orgId = orderLabel.order.orgId

    // Generate unique share code
    let shareCode = generateShareCode()
    let attempts = 0
    while (attempts < 5) {
      const existing = await db.shipment.findUnique({ where: { shareCode } })
      if (!existing) break
      shareCode = generateShareCode()
      attempts++
    }

    const shipmentName = `Shipment – ${label.deviceId}`

    // Create shipment
    const shipment = await db.shipment.create({
      data: {
        type: 'CARGO_TRACKING',
        name: shipmentName,
        shareCode,
        userId: ownerId,
        orgId,
        labelId: label.id,
        status: 'PENDING',
      },
    })

    // Backfill orphaned location events
    const backfilled = await db.locationEvent.updateMany({
      where: {
        labelId: label.id,
        shipmentId: null,
      },
      data: {
        shipmentId: shipment.id,
      },
    })

    // Clear claim token
    await db.label.update({
      where: { id: label.id },
      data: {
        claimToken: null,
        claimExpiresAt: null,
      },
    })

    // Notify purchaser + org members (fire-and-forget)
    sendAutoShipmentCreatedNotification({
      userId: ownerId,
      orgId,
      deviceId: label.deviceId,
      shipmentName,
      shareCode: shipment.shareCode,
      locationCount: label._count.locations,
    }).catch((err) => console.error('Failed to send auto-shipment notification:', err))

    console.info('[Cron] auto-created shipment for unclaimed label', {
      deviceId: label.deviceId,
      shipmentId: shipment.id,
      backfilledLocations: backfilled.count,
    })

    shipmentsCreated++
  }

  return { checked: unclaimedLabels.length, shipmentsCreated }
})
