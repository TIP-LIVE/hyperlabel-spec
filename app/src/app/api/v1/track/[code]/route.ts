import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ code: string }>
}

/**
 * GET /api/v1/track/[code]
 * 
 * Public API to fetch shipment tracking data.
 * Used for real-time polling on the tracking page.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params

    // Get optional since param for incremental updates
    const { searchParams } = new URL(req.url)
    const since = searchParams.get('since')

    const shipment = await db.shipment.findUnique({
      where: { shareCode: code },
      select: {
        id: true,
        name: true,
        status: true,
        shareEnabled: true,
        destinationAddress: true,
        destinationLat: true,
        destinationLng: true,
        deliveredAt: true,
        label: {
          select: {
            deviceId: true,
            batteryPct: true,
          },
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

    return NextResponse.json({
      shipment: {
        id: shipment.id,
        name: shipment.name,
        status: shipment.status,
        destinationAddress: shipment.destinationAddress,
        destinationLat: shipment.destinationLat,
        destinationLng: shipment.destinationLng,
        deliveredAt: shipment.deliveredAt,
        label: shipment.label,
        locations: shipment.locations,
      },
    })
  } catch (error) {
    console.error('Error fetching tracking data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
