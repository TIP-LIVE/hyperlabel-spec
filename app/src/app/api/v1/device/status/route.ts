import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, RATE_LIMIT_DEVICE, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * GET /api/v1/device/status?deviceId=HL-001234
 *
 * Returns current device health: battery, last seen, signal status, active shipment.
 * Used by the Cloud Run device-api service for health monitoring.
 *
 * Authentication: API key in header (X-API-Key) or query param (?key=)
 * Rate limit: 120 req/min per API key
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(`device:${apiKey || getClientIp(req)}`, RATE_LIMIT_DEVICE)
    if (!rl.success) return rateLimitResponse(rl)

    // Verify API key
    const expectedKey = process.env.DEVICE_API_KEY
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const deviceId = req.nextUrl.searchParams.get('deviceId')
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing parameter', details: 'Provide ?deviceId=HL-XXXXXX' },
        { status: 400 }
      )
    }

    // Find the label with its latest location and active shipment
    const label = await db.label.findUnique({
      where: { deviceId },
      select: {
        id: true,
        deviceId: true,
        imei: true,
        iccid: true,
        status: true,
        batteryPct: true,
        activatedAt: true,
        shipments: {
          where: { status: { in: ['PENDING', 'IN_TRANSIT'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            name: true,
            status: true,
            shareCode: true,
          },
        },
      },
    })

    if (!label) {
      return NextResponse.json(
        { error: 'Device not found', details: `No label found for deviceId ${deviceId}` },
        { status: 404 }
      )
    }

    // Get the most recent location event
    const lastLocation = await db.locationEvent.findFirst({
      where: { labelId: label.id },
      orderBy: { recordedAt: 'desc' },
      select: {
        latitude: true,
        longitude: true,
        batteryPct: true,
        recordedAt: true,
        accuracyM: true,
      },
    })

    // Get total location event count for this label
    const totalEvents = await db.locationEvent.count({
      where: { labelId: label.id },
    })

    const activeShipment = label.shipments[0] || null

    return NextResponse.json({
      deviceId: label.deviceId,
      imei: label.imei,
      iccid: label.iccid,
      status: label.status,
      batteryPct: label.batteryPct,
      activatedAt: label.activatedAt,
      lastSeen: lastLocation?.recordedAt || null,
      lastLocation: lastLocation
        ? {
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
            accuracy: lastLocation.accuracyM,
            battery: lastLocation.batteryPct,
            recordedAt: lastLocation.recordedAt,
          }
        : null,
      totalLocationEvents: totalEvents,
      activeShipment: activeShipment
        ? {
            id: activeShipment.id,
            name: activeShipment.name,
            status: activeShipment.status,
            shareCode: activeShipment.shareCode,
          }
        : null,
    })
  } catch (error) {
    console.error('Error getting device status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
