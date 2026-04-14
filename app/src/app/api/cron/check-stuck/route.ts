import { db, VALID_LOCATION } from '@/lib/db'
import { sendShipmentStuckNotification } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'

// Movement threshold: must move at least 500 meters in 48 hours to not be "stuck"
const MOVEMENT_THRESHOLD_M = 500

/**
 * GET /api/cron/check-stuck
 * Cron job to detect shipments that appear stuck — the device is reporting
 * location but the position hasn't changed significantly in 48+ hours.
 * This is different from "no signal" (which means no reports at all).
 */
export const GET = withCronLogging('check-stuck', async () => {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

  // Find in-transit cargo shipments with recent location data.
  // LABEL_DISPATCH shipments are excluded — "stuck" copy is cargo-specific
  // (waiting at port/customs/warehouse), and dispatch delays are surfaced
  // by the courier, not our tracking.
  const shipments = await db.shipment.findMany({
    where: {
      type: 'CARGO_TRACKING',
      status: 'IN_TRANSIT',
      labelId: { not: null },
      label: {
        status: 'ACTIVE',
        // Must have at least some locations in last 48h (otherwise "no signal" handles it)
        locations: {
          some: {
            recordedAt: { gte: fortyEightHoursAgo },
            excludedReason: null,
          },
        },
      },
    },
    include: {
      label: {
        select: {
          deviceId: true,
          locations: {
            where: { ...VALID_LOCATION },
            orderBy: { recordedAt: 'desc' },
            take: 20, // Last 20 location events
          },
        },
      },
    },
  })

  let stuckDetected = 0

  for (const shipment of shipments) {
    if (!shipment.label) continue
    const locations = shipment.label.locations
    if (locations.length < 3) continue // Need enough data points

    // Get the locations from the last 48h
    const recentLocations = locations.filter(
      (l) => l.recordedAt.getTime() >= fortyEightHoursAgo.getTime()
    )

    if (recentLocations.length < 2) continue

    // Calculate max distance between any two recent locations
    let maxDistance = 0
    for (let i = 0; i < recentLocations.length; i++) {
      for (let j = i + 1; j < recentLocations.length; j++) {
        const d = calculateDistance(
          recentLocations[i].latitude,
          recentLocations[i].longitude,
          recentLocations[j].latitude,
          recentLocations[j].longitude
        )
        maxDistance = Math.max(maxDistance, d)
      }
    }

    // If max movement is less than threshold, check if stuck long enough
    if (maxDistance < MOVEMENT_THRESHOLD_M) {
      // Only alert if the shipment has been at the same spot for 48+ hours
      const oldestTime = recentLocations[recentLocations.length - 1].recordedAt.getTime()
      const newestTime = recentLocations[0].recordedAt.getTime()
      const stuckDurationHours = (newestTime - oldestTime) / (60 * 60 * 1000)
      if (stuckDurationHours < 48) continue
      // Check if we already sent a stuck notification in the last 48h for
      // this shipment — scoped to org when present, else the owning user.
      const recentNotification = await db.notification.findFirst({
        where: {
          type: 'shipment_stuck',
          sentAt: { gte: twoDaysAgo },
          message: { contains: shipment.id },
          ...(shipment.orgId
            ? { orgId: shipment.orgId }
            : { userId: shipment.userId, orgId: null }),
        },
      })

      if (recentNotification) continue

      const latestLoc = recentLocations[0]

      await sendShipmentStuckNotification({
        userId: shipment.userId,
        orgId: shipment.orgId,
        shipmentId: shipment.id,
        shipmentName: shipment.name || 'Unnamed Shipment',
        deviceId: shipment.label.deviceId,
        shareCode: shipment.shareCode,
        lastLocation: {
          lat: latestLoc.latitude,
          lng: latestLoc.longitude,
        },
        stuckSinceHours: Math.round(
          (Date.now() - recentLocations[recentLocations.length - 1].recordedAt.getTime()) /
            (60 * 60 * 1000)
        ),
      })

      stuckDetected++
    }
  }

  return { checked: shipments.length, stuckDetected }
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
