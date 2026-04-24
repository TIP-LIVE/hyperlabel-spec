import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import {
  sendLowInventoryAlert,
  sendOrderConfirmedNotification,
} from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/admin/orders/[id]/mark-paid
 *
 * Admin: confirm an invoice was paid out-of-band (wire, manual transfer, etc.).
 * Transitions the order PENDING → PAID and allocates labels the same way the
 * Stripe webhook does: pulls INVENTORY labels not yet in any order, creates
 * OrderLabel rows, and flips them to SOLD so the org sees dispatch capacity.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
        quantity: true,
        user: { select: { email: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Order is ${order.status}, only PENDING orders can be marked paid` },
        { status: 400 }
      )
    }

    const availableLabels = await db.label.findMany({
      where: { status: 'INVENTORY', orderLabels: { none: {} } },
      take: order.quantity,
      select: { id: true },
    })

    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status: 'PAID' } }),
      ...(availableLabels.length > 0
        ? [
            db.orderLabel.createMany({
              data: availableLabels.map((l) => ({ orderId: order.id, labelId: l.id })),
              skipDuplicates: true,
            }),
            db.label.updateMany({
              where: { id: { in: availableLabels.map((l) => l.id) } },
              data: { status: 'SOLD' },
            }),
          ]
        : []),
    ])

    if (availableLabels.length < order.quantity) {
      sendLowInventoryAlert({
        availableLabels: availableLabels.length,
        requestedQuantity: order.quantity,
        assignedQuantity: availableLabels.length,
        orderId: order.id,
        orderUserEmail: order.user.email,
      }).catch((err) => console.error('Failed to send low inventory alert:', err))
    }

    sendOrderConfirmedNotification({
      userId: order.userId,
      orderNumber: order.id.slice(-8).toUpperCase(),
      quantity: order.quantity,
      totalAmount: '',
    }).catch((err) => console.error('Failed to send order confirmation:', err))

    return NextResponse.json({
      success: true,
      assignedLabels: availableLabels.length,
      requestedQuantity: order.quantity,
    })
  } catch (error) {
    return handleApiError(error, 'mark order paid')
  }
}
