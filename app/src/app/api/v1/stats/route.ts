import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/stats - Get dashboard statistics
 */
export async function GET() {
  try {
    const context = await requireOrgAuth()

    // Get current month start for "delivered this month"
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // B2B: org is top-level
    const orderFilter: Record<string, unknown> = { orgId: context.orgId }

    const [activeShipments, totalLabels, deliveredThisMonth, lowBatteryLabels] = await Promise.all([
      // Active shipments count
      db.shipment.count({
        where: orgScopedWhere(context, { status: 'IN_TRANSIT' }),
      }),

      // Total labels owned (from orders that are paid/shipped/delivered)
      db.label.count({
        where: {
          orderLabels: {
            some: {
              order: {
                ...orderFilter,
                status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
              },
            },
          },
        },
      }),

      // Delivered this month
      db.shipment.count({
        where: orgScopedWhere(context, {
          status: 'DELIVERED',
          deliveredAt: { gte: monthStart },
        }),
      }),

      // Low battery labels (< 20%)
      db.label.count({
        where: {
          orderLabels: { some: { order: orderFilter } },
          batteryPct: { lt: 20, gt: 0 },
          status: 'ACTIVE',
        },
      }),
    ])

    return NextResponse.json({
      stats: {
        activeShipments,
        totalLabels,
        deliveredThisMonth,
        lowBatteryLabels,
      },
    })
  } catch (error) {
    return handleApiError(error, 'fetching stats')
  }
}
