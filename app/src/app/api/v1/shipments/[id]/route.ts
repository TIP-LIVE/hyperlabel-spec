import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateShipmentSchema } from '@/lib/validations/shipment'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/shipments/[id] - Get shipment details
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const shipment = await db.shipment.findUnique({
      where: { id },
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
        shipmentLabels: {
          include: {
            label: {
              select: {
                id: true,
                deviceId: true,
                iccid: true,
              },
            },
          },
          take: 1,
        },
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 100,
        },
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, shipment)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Backfill orphaned label locations that weren't linked at shipment creation.
    // Run synchronously when no locations exist so the first page load shows data.
    let needsRefetch = false
    if (shipment.labelId) {
      const backfilled = await db.locationEvent.updateMany({
        where: { labelId: shipment.labelId, shipmentId: null },
        data: { shipmentId: shipment.id },
      })
      if (backfilled.count > 0) {
        console.info(`[Shipment GET] backfilled ${backfilled.count} orphaned locations for ${shipment.id}`)
        needsRefetch = true
      }
    }

    // Re-fetch locations if sync or backfill added new data
    if (needsRefetch) {
      const locations = await db.locationEvent.findMany({
        where: { shipmentId: shipment.id },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      })
      return NextResponse.json({ shipment: { ...shipment, locations } })
    }

    return NextResponse.json({ shipment })
  } catch (error) {
    return handleApiError(error, 'fetching shipment')
  }
}

/**
 * PATCH /api/v1/shipments/[id] - Update shipment
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

    // Verify shipment exists and belongs to user/org
    const existing = await db.shipment.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
        IN_TRANSIT: ['CANCELLED'],
        DELIVERED: ['IN_TRANSIT'],
        CANCELLED: [],
      }
      const allowed = allowedTransitions[existing.status] || []
      if (!allowed.includes(validated.data.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${validated.data.status}. Use the confirm-delivery endpoint to mark as delivered.` },
          { status: 400 }
        )
      }
    }

    // Update shipment
    const shipment = await db.shipment.update({
      where: { id },
      data: {
        ...validated.data,
        ...(validated.data.status === 'IN_TRANSIT' && { deliveredAt: null }),
      },
      include: {
        label: {
          select: {
            id: true,
            deviceId: true,
            batteryPct: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({ shipment })
  } catch (error) {
    return handleApiError(error, 'updating shipment')
  }
}

/**
 * DELETE /api/v1/shipments/[id] - Cancel/delete shipment
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    // Verify shipment exists and belongs to user/org
    const existing = await db.shipment.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Mark as cancelled instead of deleting (keep history)
    await db.shipment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    // Release the label back to SOLD so it can be reused
    if (existing.labelId) {
      await db.label.update({
        where: { id: existing.labelId },
        data: { status: 'SOLD' },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'deleting shipment')
  }
}
