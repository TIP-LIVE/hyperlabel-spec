import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, RATE_LIMIT_PUBLIC, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

interface RouteParams {
  params: Promise<{ code: string }>
}

/**
 * GET /api/v1/track/[code]
 *
 * Public API to fetch shipment tracking data.
 * Used for real-time polling on the tracking page.
 * Rate limit: 60 req/min per IP
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Rate limit by IP
    const rl = rateLimit(`track:${getClientIp(req)}`, RATE_LIMIT_PUBLIC)
    if (!rl.success) return rateLimitResponse(rl)

    const { code } = await params

    // Get optional since param for incremental updates
    const { searchParams } = new URL(req.url)
    const since = searchParams.get('since')

    const shipment = await db.shipment.findUnique({
      where: { shareCode: code },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        shareEnabled: true,
        labelId: true,
        originAddress: true,
        originLat: true,
        originLng: true,
        destinationAddress: true,
        destinationLat: true,
        destinationLng: true,
        deliveredAt: true,
        createdAt: true,
        label: {
          select: {
            id: true,
            deviceId: true,
            iccid: true,
            batteryPct: true,
          },
        },
        shipmentLabels: {
          include: {
            label: {
              select: { id: true, deviceId: true, iccid: true },
            },
          },
          take: 1,
        },
        locations: {
          where: since
            ? { recordedAt: { gt: new Date(since) } }
            : {},
          orderBy: { recordedAt: 'desc' },
          take: 50,
          select: {
            id: true,
            latitude: true,
            longitude: true,
            accuracyM: true,
            batteryPct: true,
            recordedAt: true,
            isOfflineSync: true,
          },
        },
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (!shipment.shareEnabled) {
      return NextResponse.json({ error: 'Tracking disabled' }, { status: 403 })
    }

    // Check share link expiry: 90 days after delivery
    if (shipment.deliveredAt) {
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000
      const expiryDate = new Date(shipment.deliveredAt.getTime() + ninetyDaysMs)
      if (new Date() > expiryDate) {
        return NextResponse.json({ error: 'Tracking link has expired' }, { status: 410 })
      }
    }

    // Backfill orphaned label locations that weren't linked at shipment creation
    if (shipment.labelId && shipment.locations.length === 0) {
      const backfilled = await db.locationEvent.updateMany({
        where: { labelId: shipment.labelId, shipmentId: null },
        data: { shipmentId: shipment.id },
      })
      if (backfilled.count > 0) {
        shipment.locations = await db.locationEvent.findMany({
          where: { shipmentId: shipment.id },
          orderBy: { recordedAt: 'desc' },
          take: 50,
          select: {
            id: true,
            latitude: true,
            longitude: true,
            accuracyM: true,
            batteryPct: true,
            recordedAt: true,
            isOfflineSync: true,
          },
        })
      }
    }

    return NextResponse.json({
      shipment: {
        id: shipment.id,
        type: shipment.type,
        name: shipment.name,
        status: shipment.status,
        labelCount: shipment.shipmentLabels?.length ?? (shipment.label ? 1 : 0),
        originAddress: shipment.originAddress,
        originLat: shipment.originLat,
        originLng: shipment.originLng,
        destinationAddress: shipment.destinationAddress,
        destinationLat: shipment.destinationLat,
        destinationLng: shipment.destinationLng,
        deliveredAt: shipment.deliveredAt,
        createdAt: shipment.createdAt,
        label: shipment.label,
        locations: shipment.locations,
      },
    })
  } catch (error) {
    console.error('Error fetching tracking data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
