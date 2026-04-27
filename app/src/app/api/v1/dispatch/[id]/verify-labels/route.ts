import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import {
  sendDispatchConsigneeInTransitNotification,
  sendDispatchInTransitNotification,
  sendOrderShippedNotification,
} from '@/lib/notifications'
import { getDispatchQuota } from '@/lib/dispatch-quota'
import { reconcileOrderShipmentStatus } from '@/lib/order-status'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const verifyLabelsSchema = z.object({
  scannedLabels: z.array(
    z.object({
      labelId: z.string().min(1),
      // ICCID is optional — labels shipped without one (no SIM yet) self-heal
      // when the first Onomondo webhook arrives: device-report.ts resolves
      // by IMEI and backfills the real ICCID.
      iccid: z.string().min(1).max(25).nullable().optional(),
    })
  ).min(1, 'At least one label must be scanned'),
})

/**
 * POST /api/v1/dispatch/[id]/verify-labels
 * Admin-only: link scanned labels to dispatch, set ICCIDs, transition to IN_TRANSIT.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    if (context.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only platform admins can verify labels' }, { status: 403 })
    }

    const body = await req.json()
    const validated = verifyLabelsSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { scannedLabels } = validated.data

    // Fetch the dispatch
    const shipment = await db.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        status: true,
        name: true,
        shareCode: true,
        orgId: true,
        labelCount: true,
        consigneeEmail: true,
        originAddress: true,
        destinationAddress: true,
        _count: { select: { shipmentLabels: true } },
      },
    })

    if (!shipment || shipment.type !== 'LABEL_DISPATCH') {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }

    if (shipment.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Dispatch is ${shipment.status}, can only verify labels on PENDING dispatches` },
        { status: 400 }
      )
    }

    // Validate all labels exist and are eligible
    const labelIds = scannedLabels.map((sl) => sl.labelId)
    const labels = await db.label.findMany({
      where: { id: { in: labelIds } },
      select: {
        id: true,
        deviceId: true,
        displayId: true,
        status: true,
        iccid: true,
        shipmentLabels: {
          where: { shipment: { status: { in: ['PENDING', 'IN_TRANSIT'] } } },
          select: { shipment: { select: { id: true, name: true } } },
        },
        shipments: {
          where: { type: 'CARGO_TRACKING', status: { in: ['PENDING', 'IN_TRANSIT'] } },
          select: { id: true, name: true },
          take: 1,
        },
      },
    })

    const labelsById = new Map(labels.map((l) => [l.id, l]))

    // Check each scanned label
    const errors: string[] = []
    for (const { labelId } of scannedLabels) {
      const label = labelsById.get(labelId)
      if (!label) {
        errors.push(`Label ${labelId} not found`)
        continue
      }
      if (label.status !== 'SOLD' && label.status !== 'INVENTORY') {
        errors.push(`Label ${label.displayId || label.deviceId} is ${label.status}`)
        continue
      }
      if (label.shipmentLabels.length > 0) {
        const dispatch = label.shipmentLabels[0].shipment
        errors.push(`Label ${label.displayId || label.deviceId} is already in dispatch "${dispatch.name}"`)
      }
      if (label.shipments.length > 0) {
        const cargo = label.shipments[0]
        errors.push(`Label ${label.displayId || label.deviceId} is already tracking cargo "${cargo.name || 'Untitled'}"`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Some labels are not eligible', details: errors }, { status: 400 })
    }

    // Check ICCID uniqueness — only for labels that provided one. Labels
    // without an ICCID will pair on first Onomondo signal via IMEI fallback.
    const providedIccids = scannedLabels
      .map((sl) => sl.iccid)
      .filter((iccid): iccid is string => !!iccid)
    if (providedIccids.length > 0) {
      const existingIccids = await db.label.findMany({
        where: {
          iccid: { in: providedIccids },
          id: { notIn: labelIds },
        },
        select: { id: true, deviceId: true, displayId: true, iccid: true },
      })

      if (existingIccids.length > 0) {
        const conflicts = existingIccids.map((l) => ({
          iccid: l.iccid,
          existingLabel: l.displayId || l.deviceId,
        }))
        return NextResponse.json(
          { error: 'ICCID conflict — already in use by another label', conflicts },
          { status: 400 }
        )
      }

      // Check for duplicate ICCIDs within the request
      const iccidSet = new Set<string>()
      for (const iccid of providedIccids) {
        if (iccidSet.has(iccid)) {
          return NextResponse.json(
            { error: `Duplicate ICCID in request: ${iccid}` },
            { status: 400 }
          )
        }
        iccidSet.add(iccid)
      }
    }

    // Per-dispatch cap: the admin scan replaces the original set, so it must
    // not exceed the dispatch's original intent — either the admin's blank
    // reservation (labelCount) or the user's pre-linked labels (shipmentLabels
    // count). Without this, admin can inflate a user's 4-label dispatch to 5+.
    // Scanning fewer is allowed (damaged/missing labels). Note: org quota
    // (below) would not catch this on its own because the current dispatch is
    // excluded from that count.
    const expectedCount = Math.max(shipment.labelCount ?? 0, shipment._count.shipmentLabels)
    if (expectedCount > 0 && scannedLabels.length > expectedCount) {
      return NextResponse.json(
        {
          error: `Cannot ship ${scannedLabels.length} label${scannedLabels.length === 1 ? '' : 's'} — this dispatch was created for ${expectedCount} label${expectedCount === 1 ? '' : 's'}`,
          expectedCount,
        },
        { status: 400 }
      )
    }

    // Org-level cap: don't ship more labels than were purchased. The current
    // dispatch is excluded — its reservation is about to be replaced by the
    // scanned set, so counting it would double-book against itself.
    if (!shipment.orgId) {
      return NextResponse.json({ error: 'Dispatch missing org' }, { status: 400 })
    }
    const quota = await getDispatchQuota(db, { orgId: shipment.orgId }, id)

    if (scannedLabels.length > quota.remaining) {
      return NextResponse.json(
        {
          error: `Cannot ship ${scannedLabels.length} label${scannedLabels.length === 1 ? '' : 's'} — only ${quota.remaining} of ${quota.totalBought} purchased label${quota.totalBought === 1 ? '' : 's'} remaining`,
          quota,
        },
        { status: 400 }
      )
    }

    // Atomically: replace labels + update ICCIDs + transition status
    await db.$transaction(async (tx) => {
      // Remove any previously linked labels (from dispatch creation)
      // and replace with the scanned set — admin is the source of truth
      await tx.shipmentLabel.deleteMany({ where: { shipmentId: id } })

      await tx.shipmentLabel.createMany({
        data: scannedLabels.map(({ labelId }) => ({
          shipmentId: id,
          labelId,
        })),
      })

      // Update ICCID only for labels where one was provided. Don't overwrite
      // an existing ICCID with null — that would unpair a previously-bound SIM.
      for (const { labelId, iccid } of scannedLabels) {
        if (!iccid) continue
        await tx.label.update({
          where: { id: labelId },
          data: { iccid },
        })
      }

      // Promote any INVENTORY labels to SOLD — the label is physically leaving
      // the warehouse. Without this, admin-dispatched labels that didn't go
      // through the Stripe PAID flow stay INVENTORY forever and later fail the
      // cargo POST guard.
      await tx.label.updateMany({
        where: { id: { in: scannedLabels.map((sl) => sl.labelId) }, status: 'INVENTORY' },
        data: { status: 'SOLD' },
      })

      // Transition to IN_TRANSIT
      await tx.shipment.update({
        where: { id },
        data: { status: 'IN_TRANSIT', deliveredAt: null },
      })
    })

    // Reconcile parent orders: PAID→SHIPPED only when *every* label in the
    // order is in an IN_TRANSIT/DELIVERED dispatch. Partial dispatches leave
    // the order PAID.
    const linkedLabelIds = scannedLabels.map((sl) => sl.labelId)
    const orderLabels = await db.orderLabel.findMany({
      where: { labelId: { in: linkedLabelIds } },
      select: { orderId: true },
    })
    const affectedOrderIds = orderLabels.map((ol) => ol.orderId)
    const changes = await reconcileOrderShipmentStatus(affectedOrderIds)

    for (const change of changes) {
      if (change.from === 'PAID' && change.to === 'SHIPPED') {
        sendOrderShippedNotification({
          userId: change.userId,
          orderNumber: change.orderId.slice(-8).toUpperCase(),
          quantity: change.quantity,
        }).catch((err) => console.error('Failed to send order shipped notification:', err))
      }
    }

    // Fire notifications (same as current PATCH handler for IN_TRANSIT)
    sendDispatchInTransitNotification({ shipmentId: id }).catch((err) =>
      console.error('Failed to send dispatch in-transit notification:', err)
    )

    if (shipment.consigneeEmail) {
      sendDispatchConsigneeInTransitNotification({
        consigneeEmail: shipment.consigneeEmail,
        shipmentName: shipment.name || 'Shipment',
        shareCode: shipment.shareCode,
        destinationAddress: shipment.destinationAddress,
      }).catch((err) =>
        console.error('Failed to send dispatch consignee in-transit notification:', err)
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'verifying labels')
  }
}
