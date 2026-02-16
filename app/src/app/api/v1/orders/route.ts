import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/orders - List user's orders
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where = orgScopedWhere(context)

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        select: {
          id: true,
          status: true,
          quantity: true,
          totalAmount: true,
          currency: true,
          trackingNumber: true,
          shippedAt: true,
          createdAt: true,
          _count: {
            select: { orderLabels: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + orders.length < total,
      },
    })
  } catch (error) {
    return handleApiError(error, 'fetching orders')
  }
}
