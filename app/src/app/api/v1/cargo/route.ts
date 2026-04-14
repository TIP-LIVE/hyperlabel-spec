import { NextRequest, NextResponse } from 'next/server'
import { db, VALID_LOCATION } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createCargoShipmentSchema } from '@/lib/validations/shipment'
import { generateShareCode } from '@/lib/utils/share-code'
import { sendLabelActivatedNotification, sendConsigneeTrackingNotification } from '@/lib/notifications'
import { reverseGeocode } from '@/lib/geocoding'

/**
 * GET /api/v1/cargo - List cargo tracking shipments
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const extraFilters: Record<string, unknown> = { type: 'CARGO_TRACKING' }
    if (status) extraFilters.status = status

    const where = orgScopedWhere(context, extraFilters)

    console.info('[cargo GET] query', { orgId: context.orgId, where: JSON.stringify(where) })

    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
        include: {
          label: {
            select: {
              id: true,
              deviceId: true,
              displayId: true,
              iccid: true,
              batteryPct: true,
              status: true,
              lastSeenAt: true,
              lastLatitude: true,
              lastLongitude: true,
            },
          },
          locations: {
            where: { source: 'CELL_TOWER', ...VALID_LOCATION },
            orderBy: { receivedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              latitude: true,
              longitude: true,
              recordedAt: true,
              receivedAt: true,
              geocodedCity: true,
              geocodedArea: true,
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

    // Backfill geocoding for locations that have coordinates but no geocoded data
    // Await so the response includes geocoded names instead of raw coordinates
    const ungeocodedLocations = shipments
      .flatMap((s) => s.locations)
      .filter((loc) => loc.latitude && loc.longitude && !loc.geocodedCity)

    if (ungeocodedLocations.length > 0) {
      await Promise.all(
        ungeocodedLocations.map(async (loc) => {
          try {
            const geo = await reverseGeocode(loc.latitude, loc.longitude)
            if (geo) {
              await db.locationEvent.update({
                where: { id: loc.id },
                data: {
                  geocodedCity: geo.city,
                  geocodedArea: geo.area,
                  geocodedCountry: geo.country,
                  geocodedCountryCode: geo.countryCode,
                },
              })
              // Update the in-memory object so the response includes geocoded data
              loc.geocodedCity = geo.city
              loc.geocodedArea = geo.area
              loc.geocodedCountry = geo.country
              loc.geocodedCountryCode = geo.countryCode
            }
          } catch (err) {
            console.warn(`[cargo] geocoding backfill failed for location ${loc.id}:`, err)
          }
        })
      )
    }

    console.info('[cargo GET] results', { orgId: context.orgId, total, shipmentCount: shipments.length })

    return NextResponse.json({
      shipments,
      pagination: { total, limit, offset, hasMore: offset + shipments.length < total },
    })
  } catch (error) {
    return handleApiError(error, 'fetching cargo shipments')
  }
}

/**
 * POST /api/v1/cargo - Create a new cargo tracking shipment
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const body = await req.json()
    const validated = createCargoShipmentSchema.safeParse({ ...body, type: 'CARGO_TRACKING' })

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
    const { labelId, consigneeEmail, consigneePhone, photoUrls, name, originLat, originLng, destinationLat, destinationLng } = data

    // Verify label exists
    const label = await db.label.findUnique({
      where: { id: labelId },
      include: { orderLabels: { include: { order: true } } },
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    if (label.status !== 'SOLD' && label.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Label is not available for shipment' }, { status: 400 })
    }

    // Check if label is already in an active cargo shipment for THIS org.
    // Cross-org check is not needed: labels are scoped to the org via the
    // dropdown, and a label physically can only be in one place at a time.
    const existingShipment = await db.shipment.findFirst({
      where: {
        labelId: label.id,
        orgId: context.orgId,
        type: 'CARGO_TRACKING',
        status: { in: ['PENDING', 'IN_TRANSIT'] },
      },
    })

    if (existingShipment) {
      return NextResponse.json({ error: 'Label is already assigned to an active shipment' }, { status: 400 })
    }

    // Create shipment + backfill locations + activate label atomically.
    // Previously these ran as 3 separate calls, which could leave a label
    // stuck in SOLD with an IN_TRANSIT shipment if the label.update failed
    // transiently (see TIP-008 incident, Apr 2026).
    const shipment = await db.$transaction(async (tx) => {
      const s = await tx.shipment.create({
        data: {
          type: 'CARGO_TRACKING',
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
          labelId: label.id,
          status: 'PENDING',
          consigneeEmail: consigneeEmail || null,
          consigneePhone: consigneePhone || null,
          photoUrls: photoUrls || [],
        },
        include: {
          label: {
            select: { id: true, deviceId: true, displayId: true, batteryPct: true, status: true },
          },
        },
      })

      // Only backfill recent orphaned events (last 24h before creation)
      // to avoid pulling stale history from previous uses of the label
      const backfillCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await tx.locationEvent.updateMany({
        where: { labelId: label.id, shipmentId: null, recordedAt: { gte: backfillCutoff } },
        data: { shipmentId: s.id },
      })

      if (label.status === 'SOLD') {
        await tx.label.update({
          where: { id: label.id },
          data: { status: 'ACTIVE', activatedAt: new Date() },
        })
      }

      return s
    })

    // Send notifications (fire and forget) — org-wide when in an org
    sendLabelActivatedNotification({
      userId: context.user.id,
      orgId: context.orgId,
      shipmentId: shipment.id,
      shipmentName: shipment.name || 'Unnamed Cargo',
      deviceId: label.deviceId,
      shareCode: shipment.shareCode,
    }).catch((err) => console.error('Failed to send activation notification:', err))

    if (consigneeEmail) {
      const senderName = context.user.firstName
        ? `${context.user.firstName}${context.user.lastName ? ' ' + context.user.lastName : ''}`
        : 'Someone'

      sendConsigneeTrackingNotification({
        consigneeEmail,
        shipmentName: shipment.name || 'Shipment',
        senderName,
        shareCode: shipment.shareCode,
        originAddress: shipment.originAddress,
        destinationAddress: shipment.destinationAddress,
      }).catch((err) => console.error('Failed to send consignee notification:', err))
    }

    return NextResponse.json({ shipment }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating cargo shipment')
  }
}
