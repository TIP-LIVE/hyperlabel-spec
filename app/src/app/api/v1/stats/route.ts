import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isClerkConfigured } from '@/lib/clerk-config'

/**
 * GET /api/v1/stats - Get dashboard statistics
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user && isClerkConfigured()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user?.id

    // Get current month start for "delivered this month"
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [activeShipments, totalLabels, deliveredThisMonth, lowBatteryLabels] = await Promise.all([
      // Active shipments count
      db.shipment.count({
        where: {
          ...(userId && { userId }),
          status: 'IN_TRANSIT',
        },
      }),

      // Total labels owned (from orders that are paid/shipped/delivered)
      db.label.count({
        where: {
          order: {
            ...(userId && { userId }),
            status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          },
        },
      }),

      // Delivered this month
      db.shipment.count({
        where: {
          ...(userId && { userId }),
          status: 'DELIVERED',
          deliveredAt: { gte: monthStart },
        },
      }),

      // Low battery labels (< 20%)
      db.label.count({
        where: {
          order: {
            ...(userId && { userId }),
          },
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
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
