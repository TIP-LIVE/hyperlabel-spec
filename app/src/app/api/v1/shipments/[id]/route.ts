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

    // On-demand sync: poll Onomondo for fresh location data (awaited with timeout)
    // Check both direct label FK and many-to-many shipmentLabels
    let didSync = false
    const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'
    const syncLabel = shipment.label?.iccid
      ? shipment.label
      : shipment.shipmentLabels?.[0]?.label?.iccid
        ? shipment.shipmentLabels[0].label
        : null

    console.info('[shipment GET] sync check', {
      shipmentId: id,
      status: shipment.status,
      isActive,
      hasDirectLabel: !!shipment.label,
      hasDirectIccid: !!shipment.label?.iccid,
      hasShipmentLabels: (shipment.shipmentLabels?.length ?? 0) > 0,
      syncLabelId: syncLabel?.deviceId ?? null,
    })

    if (isActive && syncLabel) {
      try {
        didSync = await Promise.race([
          syncLabelLocation(syncLabel),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 15000)),
        ])
        console.info('[shipment GET] sync result', { shipmentId: id, didSync })
      } catch (err) {
        console.warn('[on-demand sync] failed:', err instanceof Error ? err.message : err)
      }
    }

    // Backfill orphaned label locations that weren't linked at shipment creation.
    // Run synchronously when no locations exist so the first page load shows data.
    let needsRefetch = didSync
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

    // Update shipment
    const shipment = await db.shipment.update({
      where: { id },
      data: {
        ...validated.data,
        ...(validated.data.status === 'DELIVERED' && { deliveredAt: new Date() }),
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
