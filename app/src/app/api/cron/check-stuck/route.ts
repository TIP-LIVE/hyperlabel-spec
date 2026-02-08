import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendShipmentStuckNotification } from '@/lib/notifications'

// Cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

// Movement threshold: must move at least 500 meters in 24 hours to not be "stuck"
const MOVEMENT_THRESHOLD_M = 500

/**
 * GET /api/cron/check-stuck
 * Cron job to detect shipments that appear stuck — the device is reporting
 * location but the position hasn't changed significantly in 24+ hours.
 * This is different from "no signal" (which means no reports at all).
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Find in-transit shipments with recent location data
    const shipments = await db.shipment.findMany({
      where: {
        status: 'IN_TRANSIT',
        label: {
          status: 'ACTIVE',
          // Must have at least some locations in last 24h (otherwise "no signal" handles it)
          locations: {
            some: {
              recordedAt: { gte: twentyFourHoursAgo },
            },
          },
        },
      },
      include: {
        label: {
          select: {
            deviceId: true,
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 20, // Last 20 location events
            },
          },
        },
      },
    })

    let stuckDetected = 0

    for (const shipment of shipments) {
      const locations = shipment.label.locations
      if (locations.length < 3) continue // Need enough data points

      // Get the locations from the last 24h
      const recentLocations = locations.filter(
        (l) => l.recordedAt.getTime() >= twentyFourHoursAgo.getTime()
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

      // If max movement is less than threshold, shipment is stuck
      if (maxDistance < MOVEMENT_THRESHOLD_M) {
        // Check if we already sent a stuck notification in the last 24h
        const recentNotification = await db.notification.findFirst({
          where: {
            userId: shipment.userId,
            type: 'shipment_stuck',
            sentAt: { gte: oneDayAgo },
            message: { contains: shipment.id },
          },
        })

        if (recentNotification) continue

        const latestLoc = recentLocations[0]

        await sendShipmentStuckNotification({
          userId: shipment.userId,
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

    return NextResponse.json({
      success: true,
      checked: shipments.length,
      stuckDetected,
    })
  } catch (error) {
    console.error('Error checking stuck shipments:', error)
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
