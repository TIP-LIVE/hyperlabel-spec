import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { format } from 'date-fns'
import {
  sendConsigneeInTransitNotification,
  sendDispatchInTransitNotification,
} from '@/lib/notifications'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const verifyLabelsSchema = z.object({
  scannedLabels: z.array(
    z.object({
      labelId: z.string().min(1),
      iccid: z.string().min(1).max(25),
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
        consigneeEmail: true,
        originAddress: true,
        destinationAddress: true,
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
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Some labels are not eligible', details: errors }, { status: 400 })
    }

    // Check ICCID uniqueness
    const iccids = scannedLabels.map((sl) => sl.iccid)
    const existingIccids = await db.label.findMany({
      where: {
        iccid: { in: iccids },
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
    for (const { iccid } of scannedLabels) {
      if (iccidSet.has(iccid)) {
        return NextResponse.json(
          { error: `Duplicate ICCID in request: ${iccid}` },
          { status: 400 }
        )
      }
      iccidSet.add(iccid)
    }

    // Atomically: link labels + update ICCIDs + transition status
    await db.$transaction(async (tx) => {
      // Create ShipmentLabel entries
      await tx.shipmentLabel.createMany({
        data: scannedLabels.map(({ labelId }) => ({
          shipmentId: id,
          labelId,
        })),
      })

      // Update ICCID for each label
      for (const { labelId, iccid } of scannedLabels) {
        await tx.label.update({
          where: { id: labelId },
          data: { iccid },
        })
      }

      // Transition to IN_TRANSIT
      await tx.shipment.update({
        where: { id },
        data: { status: 'IN_TRANSIT', deliveredAt: null },
      })
    })

    // Fire notifications (same as current PATCH handler for IN_TRANSIT)
    sendDispatchInTransitNotification({ shipmentId: id }).catch((err) =>
      console.error('Failed to send dispatch in-transit notification:', err)
    )

    if (shipment.consigneeEmail) {
      sendConsigneeInTransitNotification({
        consigneeEmail: shipment.consigneeEmail,
        shipmentName: shipment.name || 'Shipment',
        shareCode: shipment.shareCode,
        originAddress: shipment.originAddress,
        destinationAddress: shipment.destinationAddress,
      }).catch((err) =>
        console.error('Failed to send consignee in-transit notification:', err)
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'verifying labels')
  }
}
