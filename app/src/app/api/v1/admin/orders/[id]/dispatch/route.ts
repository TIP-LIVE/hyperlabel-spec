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
  labelIds: z.array(z.string()).min(1),
})

/**
 * GET /api/v1/admin/orders/[id]/dispatch
 * List dispatches for an order's labels
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        orderLabels: { select: { labelId: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const labelIds = order.orderLabels.map((ol) => ol.labelId)

    if (labelIds.length === 0) {
      return NextResponse.json({ dispatches: [] })
    }

    // Find all dispatches that contain any of this order's labels
    const shipmentLabels = await db.shipmentLabel.findMany({
      where: { labelId: { in: labelIds } },
      include: {
        shipment: {
          include: {
            shipmentLabels: {
              include: {
                label: {
                  select: { id: true, deviceId: true, status: true, batteryPct: true },
                },
              },
            },
          },
        },
      },
    })

    // Deduplicate shipments
    const seen = new Set<string>()
    const dispatches = shipmentLabels
      .filter((sl) => {
        if (seen.has(sl.shipmentId)) return false
        seen.add(sl.shipmentId)
        return true
      })
      .map((sl) => sl.shipment)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json({ dispatches })
  } catch (error) {
    return handleApiError(error, 'fetching order dispatches')
  }
}

/**
 * POST /api/v1/admin/orders/[id]/dispatch
 * Create a label dispatch for selected labels from an order (admin only)
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

    const { name, labelIds } = validated.data

    // Fetch order with its labels
    const order = await db.order.findUnique({
      where: { id },
      include: {
        orderLabels: {
          include: {
            label: { select: { id: true, deviceId: true, status: true } },
          },
        },
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

    // Verify all requested labels belong to this order
    const orderLabelIds = new Set(order.orderLabels.map((ol) => ol.label.id))
    const invalidIds = labelIds.filter((lid) => !orderLabelIds.has(lid))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some labels do not belong to this order', invalidIds },
        { status: 400 }
      )
    }

    // Verify labels are SOLD or INVENTORY
    const orderLabelsMap = new Map(order.orderLabels.map((ol) => [ol.label.id, ol.label]))
    const unavailable = labelIds.filter((lid) => {
      const label = orderLabelsMap.get(lid)
      return label && label.status !== 'SOLD' && label.status !== 'INVENTORY'
    })
    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          error: 'Some labels are not available for dispatch',
          labels: unavailable.map((lid) => orderLabelsMap.get(lid)?.deviceId),
        },
        { status: 400 }
      )
    }

    // Check none of the labels are already in an active dispatch
    const existingDispatch = await db.shipmentLabel.findMany({
      where: {
        labelId: { in: labelIds },
        shipment: { status: { in: ['PENDING', 'IN_TRANSIT'] } },
      },
      include: { label: { select: { deviceId: true } } },
    })

    if (existingDispatch.length > 0) {
      return NextResponse.json(
        {
          error: 'Some labels are already in an active dispatch',
          labels: existingDispatch.map((sl) => sl.label.deviceId),
        },
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

    // Create shipment + join table entries in a transaction
    const shipment = await db.$transaction(async (tx) => {
      const s = await tx.shipment.create({
        data: {
          type: 'LABEL_DISPATCH',
          name,
          shareCode,
          userId: order.userId,
          orgId: order.orgId,
          status: 'PENDING',
        },
      })

      await tx.shipmentLabel.createMany({
        data: labelIds.map((labelId) => ({
          shipmentId: s.id,
          labelId,
        })),
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

      return tx.shipment.findUniqueOrThrow({
        where: { id: s.id },
        include: {
          shipmentLabels: {
            include: {
              label: {
                select: { id: true, deviceId: true, batteryPct: true, status: true },
              },
            },
          },
        },
      })
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
