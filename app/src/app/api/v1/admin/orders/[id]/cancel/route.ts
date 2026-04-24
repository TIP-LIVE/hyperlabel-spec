import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/admin/orders/[id]/cancel
 *
 * Admin: cancel a manually-created (source=INVOICE) order. Flips status to
 * CANCELLED, removes its OrderLabel assignments, and releases labels back to
 * INVENTORY if they aren't referenced by any other order.
 *
 * Blocked when the order has non-cancelled dispatches — admin must cancel
 * those first so physical-label state doesn't silently diverge from the DB.
 *
 * Stripe orders aren't cancellable here to preserve the accounting record;
 * use a refund-driven flow for those.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        source: true,
        orderLabels: { select: { labelId: true } },
        dispatches: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true, status: true, shareCode: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 })
    }

    if (order.source !== 'INVOICE') {
      return NextResponse.json(
        { error: 'Only invoice orders can be cancelled here' },
        { status: 400 }
      )
    }

    if (order.dispatches.length > 0) {
      return NextResponse.json(
        {
          error: `Cancel the ${order.dispatches.length} active dispatch${
            order.dispatches.length === 1 ? '' : 'es'
          } on this order first.`,
          dispatches: order.dispatches,
        },
        { status: 409 }
      )
    }

    const labelIds = order.orderLabels.map((ol) => ol.labelId)

    await db.$transaction(async (tx) => {
      await tx.orderLabel.deleteMany({ where: { orderId: order.id } })

      if (labelIds.length > 0) {
        const stillLinked = await tx.orderLabel.findMany({
          where: { labelId: { in: labelIds } },
          select: { labelId: true },
        })
        const stillLinkedIds = new Set(stillLinked.map((ol) => ol.labelId))
        const toRevert = labelIds.filter((id) => !stillLinkedIds.has(id))

        if (toRevert.length > 0) {
          await tx.label.updateMany({
            where: { id: { in: toRevert }, status: 'SOLD' },
            data: { status: 'INVENTORY' },
          })
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
    })

    return NextResponse.json({
      success: true,
      revertedLabels: labelIds.length,
    })
  } catch (error) {
    return handleApiError(error, 'cancel order')
  }
}
