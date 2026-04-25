import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { topUpOrderLabels } from '@/lib/order-labels'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/admin/orders/[id]/top-up
 *
 * One-shot fill of an existing under-filled order's OrderLabel rows from
 * current INVENTORY. Use this for orders that already have empty dispatches
 * (created before the auto-top-up at admin dispatch creation rolled out)
 * or for orders short on labels for any other reason.
 *
 * No-op if the order already has enough OrderLabels, or if INVENTORY is
 * empty. Returns toppedUp + shortBy so admin UI can show the result.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      select: { id: true, status: true, quantity: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'PAID' && order.status !== 'SHIPPED') {
      return NextResponse.json(
        { error: `Order is ${order.status} — only PAID or SHIPPED orders can be topped up` },
        { status: 400 }
      )
    }

    const result = await db.$transaction(async (tx) =>
      topUpOrderLabels(tx, { id: order.id, quantity: order.quantity })
    )

    return NextResponse.json({
      orderId: order.id,
      quantity: order.quantity,
      ...result,
    })
  } catch (error) {
    return handleApiError(error, 'topping up order labels')
  }
}
