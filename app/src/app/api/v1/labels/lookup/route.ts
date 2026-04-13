import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/labels/lookup?q=002011395
 * Look up a label by displayId or deviceId. Admin-only.
 * Used during dispatch scanning to verify a label is eligible for linking.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    // Look up by displayId first (9-digit format), then by deviceId
    const label = await db.label.findFirst({
      where: {
        OR: [
          { displayId: q },
          { deviceId: q },
        ],
      },
      select: {
        id: true,
        deviceId: true,
        displayId: true,
        imei: true,
        iccid: true,
        status: true,
        shipmentLabels: {
          where: {
            shipment: { status: { in: ['PENDING', 'IN_TRANSIT'] } },
          },
          select: {
            shipment: { select: { id: true, name: true, status: true } },
          },
        },
        shipments: {
          where: {
            type: 'CARGO_TRACKING',
            status: { in: ['PENDING', 'IN_TRANSIT'] },
          },
          select: { id: true, name: true, status: true },
          take: 1,
        },
      },
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // Check eligibility
    if (label.status !== 'SOLD' && label.status !== 'INVENTORY') {
      return NextResponse.json(
        { error: `Label is ${label.status} — only SOLD or INVENTORY labels can be dispatched`, label },
        { status: 400 }
      )
    }

    if (label.shipmentLabels.length > 0) {
      const dispatch = label.shipmentLabels[0].shipment
      return NextResponse.json(
        { error: `Label is already in dispatch "${dispatch.name}" (${dispatch.status})`, label },
        { status: 400 }
      )
    }

    if (label.shipments.length > 0) {
      const cargo = label.shipments[0]
      return NextResponse.json(
        { error: `Label is already tracking cargo "${cargo.name || 'Untitled'}" (${cargo.status})`, label },
        { status: 400 }
      )
    }

    return NextResponse.json({
      label: {
        id: label.id,
        deviceId: label.deviceId,
        displayId: label.displayId,
        imei: label.imei,
        iccid: label.iccid,
        status: label.status,
      },
    })
  } catch (error) {
    return handleApiError(error, 'looking up label')
  }
}
