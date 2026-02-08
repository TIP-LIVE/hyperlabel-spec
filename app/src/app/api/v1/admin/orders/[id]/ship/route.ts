import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { sendOrderShippedNotification } from '@/lib/notifications'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const shipSchema = z.object({
  trackingNumber: z.string().optional(),
})

/**
 * POST /api/v1/admin/orders/[id]/ship
 * Mark an order as shipped (admin only)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = shipSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const order = await db.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Only paid orders can be marked as shipped' },
        { status: 400 }
      )
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        trackingNumber: validated.data.trackingNumber,
        shippedAt: new Date(),
      },
    })

    // Send shipping confirmation email to customer (fire and forget)
    sendOrderShippedNotification({
      userId: order.userId,
      orderNumber: order.id.slice(-8).toUpperCase(),
      quantity: order.quantity,
      trackingNumber: validated.data.trackingNumber,
    }).catch((err) => console.error('Failed to send order shipped notification:', err))

    return NextResponse.json({ order: updated })
  } catch (error) {
    return handleApiError(error, 'marking order shipped')
  }
}
