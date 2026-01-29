import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isClerkConfigured } from '@/lib/clerk-config'

/**
 * GET /api/v1/orders - List user's orders
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user && isClerkConfigured()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where = user ? { userId: user.id } : {}

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
            select: { labels: true },
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
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
