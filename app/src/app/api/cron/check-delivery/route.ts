import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendShipmentDeliveredNotification } from '@/lib/notifications'

// Cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

// Delivery threshold: 100 meters from destination (per spec §5.4)
const DELIVERY_THRESHOLD_M = 100
// Dwell time: must be within radius for at least 30 minutes
const DWELL_TIME_MS = 30 * 60 * 1000

/**
 * GET /api/cron/check-delivery
 * Cron job to check if any in-transit shipments have reached their destination.
 * Uses geofence detection: if the last N location points (covering 30+ minutes)
 * are all within 100m of the destination, mark as delivered.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find in-transit shipments with a destination
    const shipments = await db.shipment.findMany({
      where: {
        status: 'IN_TRANSIT',
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

        // Send notification
        await sendShipmentDeliveredNotification({
          userId: shipment.userId,
          shipmentName: shipment.name || 'Unnamed Shipment',
          deviceId: shipment.label.deviceId,
          shareCode: shipment.shareCode,
          destination: shipment.destinationAddress || 'Destination',
        })

        deliveriesDetected++
      }
    }

    return NextResponse.json({
      success: true,
      checked: shipments.length,
      deliveriesDetected,
    })
  } catch (error) {
    console.error('Error checking deliveries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
