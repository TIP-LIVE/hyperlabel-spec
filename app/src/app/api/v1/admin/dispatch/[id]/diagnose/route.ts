import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/admin/dispatch/[id]/diagnose
 *
 * Admin-only diagnostic for the Scan & Ship Browse list. Explains *why* the
 * list looks the way it does for a specific dispatch — what scope is being
 * used, which labels are surfaced, which are hidden and the reason for each.
 * Lets admin self-serve "why is this list empty?" without grepping logs.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const dispatch = await db.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        labelCount: true,
        orderId: true,
        orgId: true,
        shipmentLabels: {
          select: {
            label: {
              select: {
                id: true,
                deviceId: true,
                displayId: true,
                status: true,
                iccid: true,
              },
            },
          },
        },
      },
    })

    if (!dispatch || dispatch.type !== 'LABEL_DISPATCH') {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }

    const order = dispatch.orderId
      ? await db.order.findUnique({
          where: { id: dispatch.orderId },
          select: {
            id: true,
            status: true,
            source: true,
            quantity: true,
            _count: { select: { orderLabels: true } },
          },
        })
      : null

    // Mirror the scope logic in /api/v1/labels/lookup/available so this
    // diagnostic stays in lock-step with what the picker actually shows.
    const orderHasLabels = order ? order._count.orderLabels > 0 : false
    const scopeUsed: 'order' | 'org' | 'unscoped' =
      dispatch.orderId && orderHasLabels
        ? 'order'
        : dispatch.orgId
          ? 'org'
          : 'unscoped'

    const scopeFilter =
      scopeUsed === 'order'
        ? { orderLabels: { some: { orderId: dispatch.orderId! } } }
        : scopeUsed === 'org'
          ? { orderLabels: { some: { order: { orgId: dispatch.orgId! } } } }
          : {}

    const labelsInScope = await db.label.findMany({
      where: {
        status: { in: ['SOLD', 'INVENTORY', 'ACTIVE'] },
        ...scopeFilter,
      },
      select: {
        id: true,
        deviceId: true,
        displayId: true,
        status: true,
        iccid: true,
        shipmentLabels: {
          where: {
            shipment: {
              type: 'LABEL_DISPATCH',
              status: { in: ['PENDING', 'IN_TRANSIT'] },
            },
          },
          select: {
            shipment: { select: { id: true, name: true, status: true } },
          },
        },
        shipments: {
          where: {
            type: 'CARGO_TRACKING',
            status: { in: ['PENDING', 'IN_TRANSIT'] },
          },
          select: { id: true, name: true, status: true },
          take: 1,
        },
      },
      orderBy: { deviceId: 'asc' },
    })

    const available: Array<{
      deviceId: string
      displayId: string | null
      status: string
      iccid: string | null
    }> = []
    const blockedByOtherDispatch: Array<{
      label: { deviceId: string; displayId: string | null; status: string }
      blockedBy: { id: string; name: string | null; status: string }
    }> = []
    const blockedByCargo: Array<{
      label: { deviceId: string; displayId: string | null; status: string }
      blockedBy: { id: string; name: string | null; status: string }
    }> = []

    for (const label of labelsInScope) {
      // Pre-linked to *this* dispatch is fine (we re-scan it on confirm).
      const otherDispatch = label.shipmentLabels.find((sl) => sl.shipment.id !== id)
      if (otherDispatch) {
        blockedByOtherDispatch.push({
          label: { deviceId: label.deviceId, displayId: label.displayId, status: label.status },
          blockedBy: otherDispatch.shipment,
        })
        continue
      }
      if (label.shipments.length > 0) {
        blockedByCargo.push({
          label: { deviceId: label.deviceId, displayId: label.displayId, status: label.status },
          blockedBy: label.shipments[0],
        })
        continue
      }
      available.push({
        deviceId: label.deviceId,
        displayId: label.displayId,
        status: label.status,
        iccid: label.iccid,
      })
    }

    return NextResponse.json({
      dispatch: {
        id: dispatch.id,
        name: dispatch.name,
        status: dispatch.status,
        labelCount: dispatch.labelCount,
        orderId: dispatch.orderId,
        orgId: dispatch.orgId,
        preLinkedLabels: dispatch.shipmentLabels.map((sl) => sl.label),
      },
      order: order
        ? {
            id: order.id,
            status: order.status,
            source: order.source,
            quantity: order.quantity,
            orderLabelCount: order._count.orderLabels,
          }
        : null,
      scopeUsed,
      summary: {
        expectedCount: dispatch.labelCount ?? 0,
        availableCount: available.length,
        blockedByOtherDispatchCount: blockedByOtherDispatch.length,
        blockedByCargoCount: blockedByCargo.length,
      },
      available,
      excluded: {
        inOtherDispatch: blockedByOtherDispatch,
        inActiveCargo: blockedByCargo,
      },
    })
  } catch (error) {
    return handleApiError(error, 'diagnosing dispatch')
  }
}
