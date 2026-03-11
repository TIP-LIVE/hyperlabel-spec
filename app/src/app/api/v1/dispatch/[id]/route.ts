import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateShipmentSchema } from '@/lib/validations/shipment'
import { syncLabelLocation } from '@/lib/sync-onomondo'

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

    // On-demand sync for first label with ICCID
    let didSync = false
    const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'
    const syncLabel = shipment.shipmentLabels?.find((sl) => sl.label?.iccid)?.label

    if (isActive && syncLabel) {
      try {
        didSync = await Promise.race([
          syncLabelLocation(syncLabel),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 15000)),
        ])
      } catch (err) {
        console.warn('[on-demand sync] failed:', err instanceof Error ? err.message : err)
      }
    }

    if (didSync) {
      const locations = await db.locationEvent.findMany({
        where: { shipmentId: shipment.id },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      })
      return NextResponse.json({ shipment: { ...shipment, locations } })
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

    await db.shipment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'cancelling dispatch')
  }
}
