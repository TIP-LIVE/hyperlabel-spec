import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/admin/orders/under-filled
 *
 * Lists PAID/SHIPPED orders where the OrderLabel count is below the order's
 * quantity — i.e. the buyer is "owed" labels that were never allocated
 * (typically because INVENTORY was empty at PAID time and no automatic
 * top-up ran later).
 *
 * Pair with POST /api/v1/admin/orders/[id]/top-up to fix one in place.
 */
export async function GET() {
  try {
    await requireAdmin()

    const orders = await db.order.findMany({
      where: { status: { in: ['PAID', 'SHIPPED'] } },
      select: {
        id: true,
        status: true,
        source: true,
        quantity: true,
        orgId: true,
        createdAt: true,
        user: { select: { email: true } },
        _count: { select: { orderLabels: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const underFilled = orders
      .filter((o) => o._count.orderLabels < o.quantity)
      .map((o) => ({
        id: o.id,
        status: o.status,
        source: o.source,
        quantity: o.quantity,
        orderLabelCount: o._count.orderLabels,
        shortBy: o.quantity - o._count.orderLabels,
        orgId: o.orgId,
        userEmail: o.user.email,
        createdAt: o.createdAt,
      }))

    return NextResponse.json({
      orders: underFilled,
      summary: {
        underFilledCount: underFilled.length,
        totalShortBy: underFilled.reduce((sum, o) => sum + o.shortBy, 0),
      },
    })
  } catch (error) {
    return handleApiError(error, 'listing under-filled orders')
  }
}
