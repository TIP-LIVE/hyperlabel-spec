import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/orders/available-labels
 *
 * Returns labels available for a new LABEL_DISPATCH shipment,
 * grouped by order. Only includes SOLD / INVENTORY labels that
 * are not committed to any non-cancelled dispatch — i.e. skips
 * PENDING, IN_TRANSIT, and DELIVERED dispatches. DELIVERED matters
 * because the label is physically at the receiver by then, not at
 * the warehouse, so re-dispatching it would be meaningless.
 */
export async function GET() {
  try {
    const context = await requireOrgAuth()

    // Get org-scoped orders that have labels
    const where = orgScopedWhere(context, {
      status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
    })

    const orders = await db.order.findMany({
      where,
      include: {
        orderLabels: {
          include: {
            label: {
              select: {
                id: true,
                deviceId: true,
                displayId: true,
                status: true,
                batteryPct: true,
                // Check if label is committed to any non-cancelled dispatch
                // (PENDING, IN_TRANSIT, or DELIVERED). Once DELIVERED the
                // label sits at the receiver, not the warehouse.
                shipmentLabels: {
                  where: {
                    shipment: {
                      status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] },
                    },
                  },
                  select: { shipmentId: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform: only include SOLD/INVENTORY labels not in an active dispatch
    const grouped = orders
      .map((order) => ({
        orderId: order.id,
        createdAt: order.createdAt,
        quantity: order.quantity,
        labels: order.orderLabels
          .map((ol) => ol.label)
          .filter(
            (label) =>
              (label.status === 'SOLD' || label.status === 'INVENTORY') &&
              label.shipmentLabels.length === 0
          )
          .map(({ shipmentLabels: _, ...label }) => label),
      }))
      .filter((group) => group.labels.length > 0)

    // Org-level cap: only allow dispatching as many labels as were purchased
    // (paid orders with totalAmount > 0). Admin-assigned $0 orders don't
    // increase dispatch capacity — they just fulfil existing paid slots.
    const [purchasedResult, activelyDispatched] = await Promise.all([
      db.order.aggregate({
        where: {
          ...orgScopedWhere(context, {}),
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          totalAmount: { gt: 0 },
        },
        _sum: { quantity: true },
      }),
      db.shipmentLabel.count({
        where: {
          shipment: {
            ...orgScopedWhere(context, {}),
            type: 'LABEL_DISPATCH',
            status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] },
          },
        },
      }),
    ])

    const totalBought = purchasedResult._sum.quantity ?? 0
    const remainingQuota = Math.max(0, totalBought - activelyDispatched)

    // Trim available labels to remaining quota
    let budget = remainingQuota
    for (const group of grouped) {
      if (budget >= group.labels.length) {
        budget -= group.labels.length
      } else {
        group.labels = group.labels.slice(0, budget)
        budget = 0
      }
    }
    const capped = grouped.filter((g) => g.labels.length > 0)

    return NextResponse.json({ orders: capped, quota: { totalBought, activelyDispatched, remaining: remainingQuota } })
  } catch (error) {
    return handleApiError(error, 'fetching available labels')
  }
}
