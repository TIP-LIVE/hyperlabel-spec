import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createDispatchShipmentSchema } from '@/lib/validations/shipment'
import { generateShareCode } from '@/lib/utils/share-code'
import { syncLabelLocation } from '@/lib/sync-onomondo'
import { reverseGeocode } from '@/lib/geocoding'

/**
 * GET /api/v1/dispatch - List label dispatch shipments
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const extraFilters: Record<string, unknown> = { type: 'LABEL_DISPATCH' }
    if (status) extraFilters.status = status

    const where = orgScopedWhere(context, extraFilters)

    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
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
                },
              },
            },
          },
          locations: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              latitude: true,
              longitude: true,
              recordedAt: true,
              geocodedCity: true,
              geocodedCountry: true,
              geocodedCountryCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.shipment.count({ where }),
    ])

    // Proactive background sync for active dispatch labels
    const activeLabels = shipments
      .filter((s) => s.status === 'PENDING' || s.status === 'IN_TRANSIT')
      .flatMap((s) =>
        s.shipmentLabels
          ?.map((sl) => sl.label)
          .filter((l) => l?.iccid) ?? []
      )

    if (activeLabels.length > 0) {
      ;(async () => {
        for (const label of activeLabels) {
          try {
            await syncLabelLocation(label as { id: string; iccid: string; deviceId: string })
          } catch {}
        }
      })().catch(() => {})
    }

    // Backfill geocoding for locations that have coordinates but no geocoded data
    const ungeocodedLocations = shipments
      .flatMap((s) => s.locations)
      .filter((loc) => loc.latitude && loc.longitude && !loc.geocodedCity)

    if (ungeocodedLocations.length > 0) {
      ;(async () => {
        for (const loc of ungeocodedLocations) {
          try {
            const geo = await reverseGeocode(loc.latitude, loc.longitude)
            if (geo) {
              await db.locationEvent.update({
                where: { id: loc.id },
                data: {
                  geocodedCity: geo.city,
                  geocodedCountry: geo.country,
                  geocodedCountryCode: geo.countryCode,
                },
              })
            }
          } catch {}
        }
      })().catch(() => {})
    }

    return NextResponse.json({
      shipments,
      pagination: { total, limit, offset, hasMore: offset + shipments.length < total },
    })
  } catch (error) {
    return handleApiError(error, 'fetching dispatches')
  }
}

/**
 * POST /api/v1/dispatch - Create a new label dispatch
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const body = await req.json()
    const validated = createDispatchShipmentSchema.safeParse({ ...body, type: 'LABEL_DISPATCH' })

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const data = validated.data

    // Generate unique share code
    let shareCode = generateShareCode()
    let attempts = 0
    while (attempts < 5) {
      const existing = await db.shipment.findUnique({ where: { shareCode } })
      if (!existing) break
      shareCode = generateShareCode()
      attempts++
    }

    const originAddress = data.originAddress?.trim() || null
    const destinationAddress = data.destinationAddress?.trim() || null
    const { labelIds, name, originLat, originLng, destinationLat, destinationLng } = data

    // Verify all labels exist and are available
    const labels = await db.label.findMany({
      where: { id: { in: labelIds } },
      include: { orderLabels: { include: { order: true } } },
    })

    if (labels.length !== labelIds.length) {
      const foundIds = new Set(labels.map((l) => l.id))
      const missing = labelIds.filter((id) => !foundIds.has(id))
      return NextResponse.json({ error: 'Labels not found', missing }, { status: 404 })
    }

    const unavailable = labels.filter((l) => l.status !== 'SOLD' && l.status !== 'INVENTORY')
    if (unavailable.length > 0) {
      return NextResponse.json(
        { error: 'Some labels are not available for dispatch', labels: unavailable.map((l) => l.deviceId) },
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

    // Create shipment + join table entries in a transaction
    const shipment = await db.$transaction(async (tx) => {
      const s = await tx.shipment.create({
        data: {
          type: 'LABEL_DISPATCH',
          name,
          originAddress,
          originLat: originLat ?? null,
          originLng: originLng ?? null,
          destinationAddress,
          destinationLat: destinationLat ?? null,
          destinationLng: destinationLng ?? null,
          shareCode,
          userId: context.user.id,
          orgId: context.orgId,
          status: 'PENDING',
        },
      })

      await tx.shipmentLabel.createMany({
        data: labelIds.map((labelId) => ({
          shipmentId: s.id,
          labelId,
        })),
      })

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

    return NextResponse.json({ shipment }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating dispatch')
  }
}
