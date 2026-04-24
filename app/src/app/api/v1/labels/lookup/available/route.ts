import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/labels/lookup/available?shipmentId=...
 * List labels eligible for a specific dispatch's Browse picker. Admin-only.
 *
 * Scoping: restricts to labels tied to the dispatch's source order (via
 * OrderLabel). Falls back to the dispatch's org when orderId is null
 * (user-created via /api/v1/dispatch, which doesn't set orderId). Without
 * this scope the picker surfaces unrelated warehouse stock and labels from
 * other customers' orders.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const shipmentId = new URL(req.url).searchParams.get('shipmentId')

    let scopeFilter: Prisma.LabelWhereInput | undefined
    let excludeShipmentId: string | undefined

    if (shipmentId) {
      const shipment = await db.shipment.findUnique({
        where: { id: shipmentId },
        select: { id: true, type: true, orderId: true, orgId: true },
      })

      if (!shipment || shipment.type !== 'LABEL_DISPATCH') {
        return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
      }

      excludeShipmentId = shipment.id

      // Prefer the dispatch's source order — tight scope to what the buyer
      // paid for. Fall back to the org when the order has no OrderLabels
      // attached (legacy source=null rows, or INVOICE/Stripe allocations
      // that ran short of inventory) so admin doesn't face an empty list
      // for orders that still owe labels.
      if (shipment.orderId) {
        const hasOrderLabels = await db.orderLabel.findFirst({
          where: { orderId: shipment.orderId },
          select: { orderId: true },
        })
        if (hasOrderLabels) {
          scopeFilter = { orderLabels: { some: { orderId: shipment.orderId } } }
        }
      }

      if (!scopeFilter && shipment.orgId) {
        scopeFilter = { orderLabels: { some: { order: { orgId: shipment.orgId } } } }
      }
    }

    const labels = await db.label.findMany({
      where: {
        status: { in: ['SOLD', 'INVENTORY', 'ACTIVE'] },
        ...(scopeFilter ?? {}),
        // Exclude labels already linked to an *other* active dispatch. The
        // current dispatch is allowed through so pre-linked labels (set at
        // dispatch creation) stay visible for re-scan.
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
      orderBy: { deviceId: 'asc' },
    })

    return NextResponse.json({ labels })
  } catch (error) {
    return handleApiError(error, 'listing available labels')
  }
}
