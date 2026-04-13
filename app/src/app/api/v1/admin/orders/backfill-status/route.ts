import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

/**
 * POST /api/v1/admin/orders/backfill-status
 *
 * One-time fix: find PAID orders whose labels are already in active dispatches
 * and transition them to SHIPPED. Covers orders where dispatches were created
 * through the user-facing endpoint (no orderId link) bypassing the auto-transition.
 */
export async function POST() {
  try {
    await requireAdmin()

    // Find all PAID orders
    const paidOrders = await db.order.findMany({
      where: { status: 'PAID' },
      select: {
        id: true,
        quantity: true,
        orderLabels: {
          select: {
            label: {
              select: {
                id: true,
                shipmentLabels: {
                  where: {
                    shipment: {
                      type: 'LABEL_DISPATCH',
                      status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] },
                    },
                  },
                  select: { shipmentId: true },
                },
              },
            },
          },
        },
      },
    })

    const updated: string[] = []

    for (const order of paidOrders) {
      // Count labels that are in an active dispatch
      const dispatchedCount = order.orderLabels.filter(
        (ol) => ol.label.shipmentLabels.length > 0
      ).length

      // If any labels are dispatched, this order should be SHIPPED
      if (dispatchedCount > 0) {
        await db.order.update({
          where: { id: order.id },
          data: { status: 'SHIPPED', shippedAt: new Date() },
        })
        updated.push(order.id.slice(-8).toUpperCase())
        logger.info('Backfill: order PAID→SHIPPED', {
          orderId: order.id,
          dispatchedLabels: dispatchedCount,
          totalLabels: order.orderLabels.length,
        })
      }
    }

    return NextResponse.json({
      checked: paidOrders.length,
      updated: updated.length,
      orders: updated,
    })
  } catch (error) {
    return handleApiError(error, 'backfilling order statuses')
  }
}
