import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { generateShareCode } from '@/lib/utils/share-code'
import { sendOrderShippedNotification } from '@/lib/notifications'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createDispatchSchema = z.object({
  name: z.string().min(1).max(200),
  labelCount: z.number().int().min(1),
})

/**
 * GET /api/v1/admin/orders/[id]/dispatch
 * List dispatches for an order
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Find dispatches linked to this order directly (new flow)
    // plus legacy dispatches linked via ShipmentLabel
    const directDispatches = await db.shipment.findMany({
      where: { orderId: id, type: 'LABEL_DISPATCH' },
      include: {
        shipmentLabels: {
          include: {
            label: {
              select: { id: true, deviceId: true, status: true, batteryPct: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Also find legacy dispatches via ShipmentLabel (for backwards compat)
    const orderLabels = await db.orderLabel.findMany({
      where: { orderId: id },
      select: { labelId: true },
    })
    const labelIds = orderLabels.map((ol) => ol.labelId)

    let legacyDispatches: typeof directDispatches = []
    if (labelIds.length > 0) {
      const shipmentLabels = await db.shipmentLabel.findMany({
        where: { labelId: { in: labelIds } },
        select: { shipmentId: true },
      })
      const legacyIds = [...new Set(shipmentLabels.map((sl) => sl.shipmentId))]
      const directIds = new Set(directDispatches.map((d) => d.id))
      const onlyLegacyIds = legacyIds.filter((sid) => !directIds.has(sid))

      if (onlyLegacyIds.length > 0) {
        legacyDispatches = await db.shipment.findMany({
          where: { id: { in: onlyLegacyIds }, type: 'LABEL_DISPATCH' },
          include: {
            shipmentLabels: {
              include: {
                label: {
                  select: { id: true, deviceId: true, status: true, batteryPct: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      }
    }

    const dispatches = [...directDispatches, ...legacyDispatches]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json({ dispatches })
  } catch (error) {
    return handleApiError(error, 'fetching order dispatches')
  }
}

/**
 * POST /api/v1/admin/orders/[id]/dispatch
 * Create a label dispatch for an order (admin only).
 * Labels are NOT pre-assigned — they get linked when admin scans them at ship time.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = createDispatchSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { name, labelCount } = validated.data

    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
        orgId: true,
        quantity: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'PAID' && order.status !== 'SHIPPED') {
      return NextResponse.json(
        { error: 'Only paid or shipped orders can have dispatches created' },
        { status: 400 }
      )
    }

    // Check label count doesn't exceed order quantity
    if (labelCount > order.quantity) {
      return NextResponse.json(
        { error: `Label count (${labelCount}) exceeds order quantity (${order.quantity})` },
        { status: 400 }
      )
    }

    // Generate unique share code
    let shareCode = generateShareCode()
    let attempts = 0
    while (attempts < 5) {
      const existing = await db.shipment.findUnique({ where: { shareCode } })
      if (!existing) break
      shareCode = generateShareCode()
      attempts++
    }

    // Create dispatch shipment (no ShipmentLabel entries — labels linked at scan time)
    const shipment = await db.$transaction(async (tx) => {
      const s = await tx.shipment.create({
        data: {
          type: 'LABEL_DISPATCH',
          name,
          shareCode,
          userId: order.userId,
          orgId: order.orgId,
          orderId: order.id,
          labelCount,
          status: 'PENDING',
        },
      })

      // Auto-update order status: PAID → SHIPPED on first dispatch
      if (order.status === 'PAID') {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'SHIPPED',
            shippedAt: new Date(),
          },
        })
      }

      return s
    })

    // Send notification on first dispatch only (when order was PAID)
    if (order.status === 'PAID') {
      sendOrderShippedNotification({
        userId: order.userId,
        orderNumber: order.id.slice(-8).toUpperCase(),
        quantity: order.quantity,
      }).catch((err) => console.error('Failed to send order shipped notification:', err))
    }

    return NextResponse.json({ shipment }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating dispatch for order')
  }
}
