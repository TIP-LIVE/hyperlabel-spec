import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { reconcileOrderShipmentStatus } from '@/lib/order-status'

/**
 * POST /api/v1/admin/orders/backfill-status
 *
 * Sweep PAID/SHIPPED orders and re-apply the "order SHIPPED ⟺ every label is
 * in an IN_TRANSIT/DELIVERED dispatch" rule. Fixes orders left in the wrong
 * state by older code paths that promoted on any-label-dispatched or at
 * dispatch creation.
 */
export async function POST() {
  try {
    await requireAdmin()

    const orders = await db.order.findMany({
      where: { status: { in: ['PAID', 'SHIPPED'] } },
      select: { id: true },
    })

    const changes = await reconcileOrderShipmentStatus(orders.map((o) => o.id))

    return NextResponse.json({
      checked: orders.length,
      updated: changes.length,
      changes: changes.map((c) => ({
        order: c.orderId.slice(-8).toUpperCase(),
        from: c.from,
        to: c.to,
      })),
    })
  } catch (error) {
    return handleApiError(error, 'backfilling order statuses')
  }
}
