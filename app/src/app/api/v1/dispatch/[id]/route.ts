import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateShipmentSchema } from '@/lib/validations/shipment'
import { format } from 'date-fns'
import {
  sendDispatchConsigneeInTransitNotification,
  sendDispatchConsigneeDeliveredNotification,
  sendDispatchInTransitNotification,
  sendDispatchDeliveredNotification,
  sendDispatchCancelledNotification,
  sendOrderShippedNotification,
} from '@/lib/notifications'
import {
  collectOrderIdsForDispatch,
  reconcileOrderShipmentStatus,
} from '@/lib/order-status'

/**
 * Keep every order touched by this dispatch in sync with its labels' current
 * dispatch state (both the direct orderId link and the legacy ShipmentLabel
 * chain). Fires shipped-notifications for PAID→SHIPPED transitions.
 */
async function reconcileOrdersForDispatch(shipment: { id: string; orderId: string | null }) {
  const orderIds = await collectOrderIdsForDispatch(shipment)
  if (orderIds.length === 0) return
  const changes = await reconcileOrderShipmentStatus(orderIds)
  for (const change of changes) {
    if (change.from === 'PAID' && change.to === 'SHIPPED') {
      sendOrderShippedNotification({
        userId: change.userId,
        orderNumber: change.orderId.slice(-8).toUpperCase(),
        quantity: change.quantity,
      }).catch((err) => console.error('Failed to send order shipped notification:', err))
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

    // Safety net: promote any INVENTORY labels on this dispatch to SOLD when
    // it transitions to IN_TRANSIT or DELIVERED. This catches labels that were
    // admin-attached without going through the Stripe PAID flow, which would
    // otherwise stay INVENTORY and fail the cargo POST guard later.
    if (validated.data.status === 'IN_TRANSIT' || validated.data.status === 'DELIVERED') {
      const labelIds = (shipment.shipmentLabels ?? []).map((sl) => sl.label.id)
      if (labelIds.length > 0) {
        await db.label.updateMany({
          where: { id: { in: labelIds }, status: 'INVENTORY' },
          data: { status: 'SOLD' },
        })
      }
    }

    // Reconcile parent order status whenever a dispatch's status changes —
    // any IN_TRANSIT/DELIVERED/CANCELLED/PENDING transition can flip whether
    // the order's labels are fully in flight.
    if (validated.data.status) {
      await reconcileOrdersForDispatch(existing)
    }

    // Send notifications on status changes (fire-and-forget)
    if (validated.data.status === 'IN_TRANSIT') {
      // Owner/buyer notification — "Your TIP labels are on their way"
      sendDispatchInTransitNotification({ shipmentId: existing.id }).catch((err) =>
        console.error('Failed to send dispatch in-transit notification:', err)
      )

      // Receiver-facing tracking email (only if we have their address)
      if (existing.consigneeEmail) {
        sendDispatchConsigneeInTransitNotification({
          consigneeEmail: existing.consigneeEmail,
          shipmentName: existing.name || 'Shipment',
          shareCode: existing.shareCode,
          destinationAddress: existing.destinationAddress,
        }).catch((err) =>
          console.error('Failed to send dispatch consignee in-transit notification:', err)
        )
      }
    }

    if (validated.data.status === 'DELIVERED') {
      // Owner/buyer notification — "Your TIP labels have arrived, time to activate"
      sendDispatchDeliveredNotification({ shipmentId: existing.id }).catch((err) =>
        console.error('Failed to send dispatch delivered notification:', err)
      )

      if (existing.consigneeEmail) {
        sendDispatchConsigneeDeliveredNotification({
          consigneeEmail: existing.consigneeEmail,
          shipmentName: existing.name || 'Shipment',
          shareCode: existing.shareCode,
          destinationAddress: existing.destinationAddress,
          deliveredAt: format(new Date(), 'PPpp'),
        }).catch((err) =>
          console.error('Failed to send dispatch consignee delivery notification:', err)
        )
      }
    }

    if (validated.data.status === 'CANCELLED') {
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

    // Revert orphan-SOLD labels back to INVENTORY. verify-labels promotes
    // INVENTORY→SOLD on scan even when no Order is linked; without this
    // revert those labels stay stuck as SOLD with no order forever.
    const dispatchLabels = await db.shipmentLabel.findMany({
      where: { shipmentId: id },
      include: {
        label: {
          select: {
            id: true,
            status: true,
            orderLabels: { select: { orderId: true } },
            shipmentLabels: {
              where: {
                shipmentId: { not: id },
                shipment: { status: { in: ['PENDING', 'IN_TRANSIT'] } },
              },
              select: { shipmentId: true },
              take: 1,
            },
          },
        },
      },
    })
    const orphanIds = dispatchLabels
      .filter(
        (sl) =>
          sl.label.status === 'SOLD' &&
          sl.label.orderLabels.length === 0 &&
          sl.label.shipmentLabels.length === 0,
      )
      .map((sl) => sl.label.id)
    if (orphanIds.length > 0) {
      await db.label.updateMany({
        where: { id: { in: orphanIds } },
        data: { status: 'INVENTORY' },
      })
    }

    // Reconcile parent order status — if cancelling this dispatch means not
    // every label is in flight anymore, revert SHIPPED→PAID.
    await reconcileOrdersForDispatch(existing)

    // Owner/buyer notification — "Your dispatch has been cancelled"
    sendDispatchCancelledNotification({ shipmentId: existing.id }).catch((err) =>
      console.error('Failed to send dispatch cancelled notification:', err)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'cancelling dispatch')
  }
}
