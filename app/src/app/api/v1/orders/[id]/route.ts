import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/orders/[id] - Get order details
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const order = await db.order.findUnique({
      where: { id },
      include: {
        labels: {
          select: {
            id: true,
            deviceId: true,
            status: true,
            batteryPct: true,
            activatedAt: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check ownership via org-aware access control
    if (!canAccessRecord(context, order)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    return handleApiError(error, 'fetching order')
  }
}
