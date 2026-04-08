import { db } from '@/lib/db'
import { sendShipmentDeliveredNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'

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
 */
export const GET = withCronLogging('check-delivery', async () => {
  // Find in-transit shipments with a destination
  const shipments = await db.shipment.findMany({
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
            take: 10, // Last 10 location events
          },
        },
      },
    },
  })

  let deliveriesDetected = 0

  for (const shipment of shipments) {
    if (!shipment.label) continue
    const locations = shipment.label.locations
    if (locations.length < 2) continue

    const destLat = shipment.destinationLat!
    const destLng = shipment.destinationLng!

    // Check if all recent locations are within the geofence
    const locationsWithinGeofence = locations.filter((loc) => {
      const distance = calculateDistance(loc.latitude, loc.longitude, destLat, destLng)
      return distance <= DELIVERY_THRESHOLD_M
    })

    if (locationsWithinGeofence.length < 2) continue

    // Check dwell time: difference between oldest and newest in-range location
    const oldest = locationsWithinGeofence[locationsWithinGeofence.length - 1]
    const newest = locationsWithinGeofence[0]
    const dwellTime = newest.recordedAt.getTime() - oldest.recordedAt.getTime()

    if (dwellTime >= DWELL_TIME_MS) {
      // Mark shipment as delivered
      await db.shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      })

      // Send notification (org-wide if shipment belongs to an org)
      await sendShipmentDeliveredNotification({
        userId: shipment.userId,
        orgId: shipment.orgId,
        shipmentId: shipment.id,
        shipmentName: shipment.name || 'Unnamed Shipment',
        deviceId: shipment.label.deviceId,
        shareCode: shipment.shareCode,
        destination: shipment.destinationAddress || 'Destination',
        source: 'auto',
      })

      deliveriesDetected++
    }
  }

  return { checked: shipments.length, deliveriesDetected }
})

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
