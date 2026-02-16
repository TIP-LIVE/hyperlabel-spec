import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deviceReportSchema, validateLocation } from '@/lib/validations/device'
import { sendShipmentDeliveredNotification, sendConsigneeInTransitNotification, sendConsigneeDeliveredNotification } from '@/lib/notifications'
import { format } from 'date-fns'
import { rateLimit, RATE_LIMIT_DEVICE, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/v1/device/report
 *
 * Receives location reports from tracking labels.
 * This endpoint is called by the device firmware or via label.utec.ua webhook.
 *
 * Authentication: API key in header (X-API-Key) or query param (?key=)
 * Rate limit: 120 req/min per API key
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit by API key or IP
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(`device:${apiKey || getClientIp(req)}`, RATE_LIMIT_DEVICE)
    if (!rl.success) return rateLimitResponse(rl)

    // Verify API key (simple auth for device endpoints)
    const expectedKey = process.env.DEVICE_API_KEY

    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const body = await req.json()
    const validated = deviceReportSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const data = validated.data

    // Validate location coordinates
    if (!validateLocation(data.latitude, data.longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates', details: 'Location appears to be null island or invalid' },
        { status: 400 }
      )
    }

    // Shipment select fields (reused for all lookup strategies)
    const shipmentSelect = {
      id: true,
      name: true,
      status: true,
      shareCode: true,
      userId: true,
      originAddress: true,
      destinationAddress: true,
      destinationLat: true,
      destinationLng: true,
      consigneeEmail: true,
    }

    const shipmentInclude = {
      shipments: {
        where: { status: { in: ['PENDING', 'IN_TRANSIT'] as ['PENDING', 'IN_TRANSIT'] } },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: shipmentSelect,
      },
    }

    // Find the label by deviceId, IMEI, or ICCID
    let label = data.deviceId
      ? await db.label.findUnique({
          where: { deviceId: data.deviceId },
          include: shipmentInclude,
        })
      : null

    // Fallback: look up by IMEI
    if (!label && data.imei) {
      label = await db.label.findFirst({
        where: { imei: data.imei },
        include: shipmentInclude,
      })
    }

    // Fallback: look up by ICCID
    if (!label && data.iccid) {
      label = await db.label.findFirst({
        where: { iccid: data.iccid },
        include: shipmentInclude,
      })
    }

    if (!label) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Get the active shipment (if any)
    const activeShipment = label.shipments[0]

    // Parse recorded timestamp or use current time
    const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date()
    const receivedAt = new Date()

    // Auto-detect offline sync: if recorded time is > 5 min before server receive, it's offline
    const OFFLINE_SYNC_THRESHOLD_MS = 5 * 60 * 1000
    const isOfflineSync = data.isOfflineSync === true
      ? true // Explicitly marked by webhook
      : receivedAt.getTime() - recordedAt.getTime() > OFFLINE_SYNC_THRESHOLD_MS

    // Store the location event
    const locationEvent = await db.locationEvent.create({
      data: {
        labelId: label.id,
        shipmentId: activeShipment?.id || null,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracyM: data.accuracy ? Math.round(data.accuracy) : null,
        altitude: data.altitude,
        speed: data.speed,
        batteryPct: data.battery,
        recordedAt,
        receivedAt,
        isOfflineSync,
        cellLatitude: data.cellLatitude,
        cellLongitude: data.cellLongitude,
      },
    })

    // Update label battery if provided
    if (data.battery !== undefined) {
      await db.label.update({
        where: { id: label.id },
        data: { batteryPct: data.battery },
      })
    }

    // If shipment is PENDING and we received first location, update to IN_TRANSIT
    if (activeShipment && activeShipment.status === 'PENDING') {
      await db.shipment.update({
        where: { id: activeShipment.id },
        data: { status: 'IN_TRANSIT' },
      })

      // Notify consignee that shipment is now in transit
      if (activeShipment.consigneeEmail) {
        sendConsigneeInTransitNotification({
          consigneeEmail: activeShipment.consigneeEmail,
          shipmentName: activeShipment.name || 'Shipment',
          shareCode: activeShipment.shareCode,
          originAddress: activeShipment.originAddress,
          destinationAddress: activeShipment.destinationAddress,
        }).catch((err) => console.error('Failed to send consignee in-transit notification:', err))
      }
    }

    // Check for delivery (if within geofence of destination)
    if (
      activeShipment &&
      activeShipment.status === 'IN_TRANSIT' &&
      activeShipment.destinationLat &&
      activeShipment.destinationLng
    ) {
      const distance = calculateDistance(
        data.latitude,
        data.longitude,
        activeShipment.destinationLat,
        activeShipment.destinationLng
      )

      // Delivery threshold: 100 meters from destination (per spec §5.4)
      const DELIVERY_THRESHOLD_M = 100

      if (distance <= DELIVERY_THRESHOLD_M) {
        // Check dwell time: look at recent locations to see if we've been near destination for 30+ min
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
        const recentLocations = await db.locationEvent.findMany({
          where: {
            shipmentId: activeShipment.id,
            recordedAt: { gte: thirtyMinAgo },
          },
          orderBy: { recordedAt: 'desc' },
        })

        // If we have at least 2 readings in the last 30 min, all within geofence → delivered
        const allNearDestination = recentLocations.length >= 2 &&
          recentLocations.every((loc) => {
            const d = calculateDistance(
              loc.latitude,
              loc.longitude,
              activeShipment.destinationLat!,
              activeShipment.destinationLng!
            )
            return d <= DELIVERY_THRESHOLD_M
          })

        if (allNearDestination) {
          await db.shipment.update({
            where: { id: activeShipment.id },
            data: { status: 'DELIVERED', deliveredAt: new Date() },
          })

          // Send delivery notification to shipper (fire and forget)
          sendShipmentDeliveredNotification({
            userId: activeShipment.userId,
            shipmentName: activeShipment.name || 'Unnamed Shipment',
            deviceId: label.deviceId,
            shareCode: activeShipment.shareCode,
            destination: activeShipment.destinationAddress || 'Destination',
          }).catch((err) => console.error('Failed to send delivery notification:', err))

          // Send delivery notification to consignee
          if (activeShipment.consigneeEmail) {
            sendConsigneeDeliveredNotification({
              consigneeEmail: activeShipment.consigneeEmail,
              shipmentName: activeShipment.name || 'Shipment',
              shareCode: activeShipment.shareCode,
              destinationAddress: activeShipment.destinationAddress,
              deliveredAt: format(new Date(), 'PPpp'),
            }).catch((err) => console.error('Failed to send consignee delivery notification:', err))
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      locationId: locationEvent.id,
      shipmentId: activeShipment?.id || null,
    })
  } catch (error) {
    console.error('Error processing device report:', error)
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
