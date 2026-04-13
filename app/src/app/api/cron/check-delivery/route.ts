import { db } from '@/lib/db'
import { sendShipmentDeliveredNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'
import { maybeCompleteOrder } from '@/lib/order-utils'

// Delivery threshold: 1500m from destination.
// Device uses cell tower triangulation (~500-1000m accuracy), not GPS.
const DELIVERY_THRESHOLD_M = 1500
// Dwell time: must be within radius for at least 30 minutes
const DWELL_TIME_MS = 30 * 60 * 1000

/**
 * GET /api/cron/check-delivery
 * Cron job to check if any in-transit shipments have reached their destination.
 * Uses geofence detection: if the last N location points (covering 30+ minutes)
 * are all within 1500m of the destination, mark as delivered.
 * Threshold is 1500m because location is cell tower triangulation (~500-1000m accuracy).
 *
 * Handles both:
 * - CARGO_TRACKING shipments (single label via labelId)
 * - LABEL_DISPATCH shipments (multiple labels via shipmentLabels)
 */
export const GET = withCronLogging('check-delivery', async () => {
  let deliveriesDetected = 0

  // ── Part 1: CARGO_TRACKING (single-label shipments) ──
  const cargoShipments = await db.shipment.findMany({
    where: {
      status: 'IN_TRANSIT',
      labelId: { not: null },
      destinationLat: { not: null },
      destinationLng: { not: null },
    },
    include: {
      user: { select: { id: true } },
      label: {
        select: {
          deviceId: true,
          locations: {
            orderBy: { recordedAt: 'desc' },
            take: 10,
          },
        },
      },
    },
  })

  for (const shipment of cargoShipments) {
    if (!shipment.label) continue
    const delivered = checkGeofence(
      shipment.label.locations,
      shipment.destinationLat!,
      shipment.destinationLng!
    )
    if (!delivered) continue

    await markDelivered(shipment)
    deliveriesDetected++
  }

  // ── Part 2: LABEL_DISPATCH (multi-label shipments) ──
  const dispatchShipments = await db.shipment.findMany({
    where: {
      status: 'IN_TRANSIT',
      type: 'LABEL_DISPATCH',
      destinationLat: { not: null },
      destinationLng: { not: null },
      shipmentLabels: { some: {} }, // at least one label linked
    },
    include: {
      user: { select: { id: true } },
      shipmentLabels: {
        include: {
          label: {
            select: {
              deviceId: true,
              locations: {
                orderBy: { recordedAt: 'desc' },
                take: 10,
              },
            },
          },
        },
      },
    },
  })

  for (const shipment of dispatchShipments) {
    // Aggregate locations from ALL linked labels
    const allLocations = shipment.shipmentLabels
      .flatMap((sl) => sl.label.locations)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())

    if (allLocations.length < 2) continue

    const delivered = checkGeofence(
      allLocations,
      shipment.destinationLat!,
      shipment.destinationLng!
    )
    if (!delivered) continue

    await markDelivered(shipment)

    // Cascade: if this dispatch belongs to an order, check if order is now complete
    if (shipment.orderId) {
      await maybeCompleteOrder(shipment.orderId)
    }

    deliveriesDetected++
  }

  return {
    checked: cargoShipments.length + dispatchShipments.length,
    deliveriesDetected,
  }
})

/**
 * Check if locations satisfy the geofence + dwell time criteria.
 */
function checkGeofence(
  locations: { latitude: number; longitude: number; recordedAt: Date }[],
  destLat: number,
  destLng: number
): boolean {
  if (locations.length < 2) return false

  const withinGeofence = locations.filter((loc) => {
    const distance = calculateDistance(loc.latitude, loc.longitude, destLat, destLng)
    return distance <= DELIVERY_THRESHOLD_M
  })

  if (withinGeofence.length < 2) return false

  const oldest = withinGeofence[withinGeofence.length - 1]
  const newest = withinGeofence[0]
  const dwellTime = newest.recordedAt.getTime() - oldest.recordedAt.getTime()

  return dwellTime >= DWELL_TIME_MS
}

/**
 * Mark a shipment as delivered and send notification.
 */
async function markDelivered(shipment: {
  id: string
  userId: string
  orgId: string | null
  name: string | null
  shareCode: string
  destinationAddress: string | null
  orderId?: string | null
  label?: { deviceId: string } | null
  shipmentLabels?: { label: { deviceId: string } }[]
}) {
  await db.shipment.update({
    where: { id: shipment.id },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  })

  const deviceId =
    shipment.label?.deviceId ??
    shipment.shipmentLabels?.[0]?.label.deviceId ??
    'unknown'

  await sendShipmentDeliveredNotification({
    userId: shipment.userId,
    orgId: shipment.orgId,
    shipmentId: shipment.id,
    shipmentName: shipment.name || 'Unnamed Shipment',
    deviceId,
    shareCode: shipment.shareCode,
    destination: shipment.destinationAddress || 'Destination',
    source: 'auto',
  })
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
