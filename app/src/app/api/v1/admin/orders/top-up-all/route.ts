import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { topUpOrderLabels } from '@/lib/order-labels'

/**
 * POST /api/v1/admin/orders/top-up-all
 *
 * One-shot data fix: iterate every under-filled PAID/SHIPPED order and pull
 * from current INVENTORY to close each gap. Idempotent — safe to re-run.
 *
 * Stops requesting more stock once INVENTORY is exhausted (every subsequent
 * call would return shortBy = needed); remaining orders are reported with
 * skipped: true so admin knows to provision more labels and re-run.
 */
export async function POST() {
  try {
    await requireAdmin()

    const orders = await db.order.findMany({
      where: { status: { in: ['PAID', 'SHIPPED'] } },
      select: {
        id: true,
        quantity: true,
        _count: { select: { orderLabels: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const underFilled = orders.filter((o) => o._count.orderLabels < o.quantity)

    const results: Array<{
      orderId: string
      toppedUp: number
      shortBy: number
      skipped?: boolean
    }> = []
    let inventoryEmpty = false

    for (const order of underFilled) {
      const initialShort = order.quantity - order._count.orderLabels

      if (inventoryEmpty) {
        results.push({ orderId: order.id, toppedUp: 0, shortBy: initialShort, skipped: true })
        continue
      }

      const result = await db.$transaction(async (tx) =>
        topUpOrderLabels(tx, { id: order.id, quantity: order.quantity })
      )

      results.push({ orderId: order.id, ...result })

      if (result.toppedUp === 0 && result.shortBy > 0) {
        inventoryEmpty = true
      }
    }

    return NextResponse.json({
      summary: {
        underFilledCount: underFilled.length,
        ordersTouched: results.filter((r) => r.toppedUp > 0).length,
        totalToppedUp: results.reduce((sum, r) => sum + r.toppedUp, 0),
        totalStillShortBy: results.reduce((sum, r) => sum + r.shortBy, 0),
        inventoryExhausted: inventoryEmpty,
      },
      results,
    })
  } catch (error) {
    return handleApiError(error, 'topping up all orders')
  }
}
