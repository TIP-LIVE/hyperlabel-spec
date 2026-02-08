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
            batteryPct: true,
            status: true,
            firmwareVersion: true,
            activatedAt: true,
          },
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

    // Update shipment
    const shipment = await db.shipment.update({
      where: { id },
      data: {
        ...validated.data,
        ...(validated.data.status === 'DELIVERED' && { deliveredAt: new Date() }),
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

    // Mark as cancelled instead of deleting (keep history)
    await db.shipment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'deleting shipment')
  }
}
