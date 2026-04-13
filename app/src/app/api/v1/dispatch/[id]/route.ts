import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateShipmentSchema } from '@/lib/validations/shipment'
import { format } from 'date-fns'
import {
  sendConsigneeInTransitNotification,
  sendConsigneeDeliveredNotification,
  sendDispatchInTransitNotification,
  sendDispatchDeliveredNotification,
  sendDispatchCancelledNotification,
} from '@/lib/notifications'

/**
 * When a dispatch is cancelled, check if the parent order should revert
 * from SHIPPED → PAID (no remaining active dispatches).
 * Resolves the order via orderId (new flow) or ShipmentLabel→OrderLabel (legacy).
 */
async function revertOrderIfNoDispatches(shipment: { id: string; orderId: string | null }) {
  // Find the related order(s) — either directly via orderId or via label chain
  const orderIds = new Set<string>()
  if (shipment.orderId) orderIds.add(shipment.orderId)

  // Legacy: find orders via ShipmentLabel → Label → OrderLabel
  const shipmentLabels = await db.shipmentLabel.findMany({
    where: { shipmentId: shipment.id },
    select: { label: { select: { orderLabels: { select: { orderId: true } } } } },
  })
  for (const sl of shipmentLabels) {
    for (const ol of sl.label.orderLabels) {
      orderIds.add(ol.orderId)
    }
  }

  if (orderIds.size === 0) return

  for (const orderId of orderIds) {
    // Check both direct (orderId) and legacy (ShipmentLabel) dispatches
    const directCount = await db.shipment.count({
      where: { orderId, type: 'LABEL_DISPATCH', status: { not: 'CANCELLED' } },
    })
    const legacyCount = await db.shipmentLabel.count({
      where: {
        label: { orderLabels: { some: { orderId } } },
        shipment: { type: 'LABEL_DISPATCH', status: { not: 'CANCELLED' } },
      },
    })
    if (directCount === 0 && legacyCount === 0) {
      await db.order.updateMany({
        where: { id: orderId, status: 'SHIPPED' },
        data: { status: 'PAID', shippedAt: null },
      })
    }
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/dispatch/[id] - Get dispatch details
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        shipmentLabels: {
          include: {
            label: {
              select: {
                id: true,
                deviceId: true,
                iccid: true,
                batteryPct: true,
                status: true,
                firmwareVersion: true,
                activatedAt: true,
              },
            },
          },
        },
        locations: {
          where: { excludedReason: null },
          orderBy: { recordedAt: 'desc' },
          take: 100,
        },
      },
    })

    if (!shipment || shipment.type !== 'LABEL_DISPATCH') {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, shipment)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ shipment })
  } catch (error) {
    return handleApiError(error, 'fetching dispatch')
  }
}

/**
 * PATCH /api/v1/dispatch/[id] - Update dispatch
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const body = await req.json()
    const validated = updateShipmentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.shipment.findUnique({ where: { id } })

    if (!existing || existing.type !== 'LABEL_DISPATCH') {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only platform admins can change dispatch status
    if (validated.data.status && context.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only platform admins can change dispatch status' },
        { status: 403 }
      )
    }

    // Block non-status edits on delivered/cancelled shipments
    if ((existing.status === 'DELIVERED' || existing.status === 'CANCELLED') && !validated.data.status) {
      return NextResponse.json(
        { error: `Cannot update a ${existing.status.toLowerCase()} shipment` },
        { status: 400 }
      )
    }

    // Validate status transitions if status is being changed
    if (validated.data.status) {
      const allowedTransitions: Record<string, string[]> = {
        PENDING: ['IN_TRANSIT', 'CANCELLED'],
        IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
        DELIVERED: ['IN_TRANSIT'],
        CANCELLED: ['PENDING'],
      }
      const allowed = allowedTransitions[existing.status] || []
      if (!allowed.includes(validated.data.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${validated.data.status}. Use the confirm-delivery endpoint to mark as delivered.` },
          { status: 400 }
        )
      }
    }

    const shipment = await db.shipment.update({
      where: { id },
      data: {
        ...validated.data,
        ...(validated.data.status === 'DELIVERED' && { deliveredAt: new Date() }),
        ...(validated.data.status === 'IN_TRANSIT' && { deliveredAt: null }),
      },
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

    // Send notifications on status changes (fire-and-forget)
    if (validated.data.status === 'IN_TRANSIT') {
      // Owner/buyer notification — "Your TIP labels are on their way"
      sendDispatchInTransitNotification({ shipmentId: existing.id }).catch((err) =>
        console.error('Failed to send dispatch in-transit notification:', err)
      )

      // Receiver-facing tracking email (only if we have their address)
      if (existing.consigneeEmail) {
        sendConsigneeInTransitNotification({
          consigneeEmail: existing.consigneeEmail,
          shipmentName: existing.name || 'Shipment',
          shareCode: existing.shareCode,
          originAddress: existing.originAddress,
          destinationAddress: existing.destinationAddress,
        }).catch((err) =>
          console.error('Failed to send consignee in-transit notification:', err)
        )
      }
    }

    if (validated.data.status === 'DELIVERED') {
      // Owner/buyer notification — "Your TIP labels have arrived, time to activate"
      sendDispatchDeliveredNotification({ shipmentId: existing.id }).catch((err) =>
        console.error('Failed to send dispatch delivered notification:', err)
      )

      if (existing.consigneeEmail) {
        sendConsigneeDeliveredNotification({
          consigneeEmail: existing.consigneeEmail,
          shipmentName: existing.name || 'Shipment',
          shareCode: existing.shareCode,
          destinationAddress: existing.destinationAddress,
          deliveredAt: format(new Date(), 'PPpp'),
        }).catch((err) =>
          console.error('Failed to send consignee delivery notification:', err)
        )
      }
    }

    if (validated.data.status === 'CANCELLED') {
      // Revert parent order SHIPPED→PAID if no active dispatches remain
      revertOrderIfNoDispatches(existing).catch((err) =>
        console.error('Failed to revert order status on dispatch cancel:', err)
      )
      // Owner/buyer notification — "Your dispatch has been cancelled"
      sendDispatchCancelledNotification({ shipmentId: existing.id }).catch((err) =>
        console.error('Failed to send dispatch cancelled notification:', err)
      )
    }

    return NextResponse.json({ shipment })
  } catch (error) {
    return handleApiError(error, 'updating dispatch')
  }
}

/**
 * DELETE /api/v1/dispatch/[id] - Cancel dispatch
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const existing = await db.shipment.findUnique({ where: { id } })

    if (!existing || existing.type !== 'LABEL_DISPATCH') {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only platform admins can cancel dispatches
    if (context.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only platform admins can cancel dispatches' },
        { status: 403 }
      )
    }

    // Prevent cancelling already delivered or cancelled shipments
    if (existing.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'Cannot cancel a delivered shipment' },
        { status: 400 }
      )
    }
    if (existing.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Shipment is already cancelled' },
        { status: 400 }
      )
    }

    await db.shipment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    // Revert parent order SHIPPED→PAID if no active dispatches remain
    revertOrderIfNoDispatches(existing).catch((err) =>
      console.error('Failed to revert order status on dispatch cancel:', err)
    )

    // Owner/buyer notification — "Your dispatch has been cancelled"
    sendDispatchCancelledNotification({ shipmentId: existing.id }).catch((err) =>
      console.error('Failed to send dispatch cancelled notification:', err)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'cancelling dispatch')
  }
}
