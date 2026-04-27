import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/labels/lookup/available?shipmentId=...
 * List warehouse labels eligible to be physically dispatched. Admin-only.
 *
 * Scope: ALL warehouse stock with real hardware (imei present), not just
 * the dispatch's pre-allocated order labels. Admin ships from whatever is
 * physically on the shelf — the verify-labels endpoint re-binds OrderLabels
 * on confirm. `shipmentId` is still used to allow re-scanning labels already
 * pre-linked to *this* dispatch.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const shipmentId = new URL(req.url).searchParams.get('shipmentId')

    let excludeShipmentId: string | undefined
    if (shipmentId) {
      const shipment = await db.shipment.findUnique({
        where: { id: shipmentId },
        select: { id: true, type: true },
      })
      if (!shipment || shipment.type !== 'LABEL_DISPATCH') {
        return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
      }
      excludeShipmentId = shipment.id
    }

    const labels = await db.label.findMany({
      where: {
        // Real hardware only — placeholder slots from order checkout (no
        // imei) are not physically dispatchable.
        imei: { not: null },
        status: { in: ['SOLD', 'INVENTORY', 'ACTIVE'] },
        // Exclude labels already linked to an *other* active dispatch. The
        // current dispatch is allowed through so pre-linked labels stay
        // visible for re-scan.
        shipmentLabels: {
          none: {
            shipment: {
              type: 'LABEL_DISPATCH',
              status: { in: ['PENDING', 'IN_TRANSIT'] },
              ...(excludeShipmentId ? { NOT: { id: excludeShipmentId } } : {}),
            },
          },
        },
        // Exclude labels already in active cargo tracking
        shipments: {
          none: {
            type: 'CARGO_TRACKING',
            status: { in: ['PENDING', 'IN_TRANSIT'] },
          },
        },
      },
      select: {
        id: true,
        deviceId: true,
        displayId: true,
        iccid: true,
        status: true,
        batteryPct: true,
      },
      orderBy: [
        // INVENTORY first (purest free stock), then SOLD, then ACTIVE
        { status: 'asc' },
        { deviceId: 'asc' },
      ],
      take: 100,
    })

    return NextResponse.json({ labels })
  } catch (error) {
    return handleApiError(error, 'listing available labels')
  }
}
