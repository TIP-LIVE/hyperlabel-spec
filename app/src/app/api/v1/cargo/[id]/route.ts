import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateShipmentSchema } from '@/lib/validations/shipment'
import { reverseGeocode } from '@/lib/geocoding'
import { isNullIsland } from '@/lib/validations/device'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/cargo/[id] - Get cargo shipment details
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const searchParams = req.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

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
        locations: {
          where: { source: 'CELL_TOWER' },
          orderBy: { recordedAt: 'desc' },
          take: limit,
          skip: offset,
        },
      },
    })

    if (!shipment || shipment.type !== 'CARGO_TRACKING') {
      return NextResponse.json({ error: 'Cargo shipment not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, shipment)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Backfill orphaned label locations
    let needsRefetch = false
    if (shipment.labelId) {
      const backfilled = await db.locationEvent.updateMany({
        where: { labelId: shipment.labelId, shipmentId: null },
        data: { shipmentId: shipment.id },
      })
      if (backfilled.count > 0) {
        needsRefetch = true
      }
    }

    // Backfill geocoding for locations missing geocoded data
    const finalLocations = needsRefetch
      ? (await db.locationEvent.findMany({
          where: { shipmentId: shipment.id, source: 'CELL_TOWER' },
          orderBy: { recordedAt: 'desc' },
          take: limit,
          skip: offset,
        }))
      : shipment.locations

    // Deduplicate locations that share the same recordedAt + coordinates + source
    // (handles Onomondo double-sends already stored in DB)
    const seen = new Set<string>()
    const deduped = finalLocations.filter((loc) => {
      const key = `${loc.recordedAt.toISOString()}|${loc.latitude}|${loc.longitude}|${loc.source}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const totalLocations = await db.locationEvent.count({
      where: { shipmentId: shipment.id },
    })
    // Adjust total by the number of duplicates removed from this page
    const duplicatesRemoved = finalLocations.length - deduped.length

    // Fetch the actual oldest location so the frontend can infer origin
    // independently of which page of locations is currently loaded
    const oldestLocation = await db.locationEvent.findFirst({
      where: { shipmentId: shipment.id },
      orderBy: { recordedAt: 'asc' },
    })

    const ungeocodedLocations = deduped.filter(
      (loc) => loc.latitude && loc.longitude && !isNullIsland(loc.latitude, loc.longitude) && (!loc.geocodedCity || !loc.geocodedArea)
    )
    // Await geocoding for the first batch so the response includes geocoded names
    const urgent = ungeocodedLocations.slice(0, 10)
    const rest = ungeocodedLocations.slice(10)

    for (const loc of urgent) {
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
          Object.assign(loc, {
            geocodedCity: geo.city,
            geocodedArea: geo.area,
            geocodedCountry: geo.country,
            geocodedCountryCode: geo.countryCode,
          })
        }
      } catch {}
    }

    // Use after() so background geocoding survives after response is sent on Vercel
    if (rest.length > 0) {
      after(async () => {
        for (const loc of rest) {
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
            }
          } catch {}
        }
      })
    }

    // Backfill origin/destination address from coordinates if missing
    const addressUpdates: Record<string, string> = {}
    const s = needsRefetch ? { ...shipment, locations: deduped } : { ...shipment, locations: deduped }

    if (s.originLat != null && s.originLng != null && !s.originAddress && !isNullIsland(s.originLat, s.originLng)) {
      const geo = await reverseGeocode(s.originLat, s.originLng)
      if (geo) {
        const addr = geo.city && geo.country ? `${geo.city}, ${geo.country}` : geo.city || geo.country
        if (addr) addressUpdates.originAddress = addr
      }
    }
    if (s.destinationLat != null && s.destinationLng != null && !s.destinationAddress && !isNullIsland(s.destinationLat, s.destinationLng)) {
      const geo = await reverseGeocode(s.destinationLat, s.destinationLng)
      if (geo) {
        const addr = geo.city && geo.country ? `${geo.city}, ${geo.country}` : geo.city || geo.country
        if (addr) addressUpdates.destinationAddress = addr
      }
    }

    if (Object.keys(addressUpdates).length > 0) {
      await db.shipment.update({ where: { id: s.id }, data: addressUpdates })
      Object.assign(s, addressUpdates)
    }

    return NextResponse.json({
      shipment: s,
      totalLocations: totalLocations - duplicatesRemoved,
      hasMoreLocations: offset + finalLocations.length < totalLocations,
      oldestLocation,
    })
  } catch (error) {
    return handleApiError(error, 'fetching cargo shipment')
  }
}

/**
 * PATCH /api/v1/cargo/[id] - Update cargo shipment
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

    if (!existing || existing.type !== 'CARGO_TRACKING') {
      return NextResponse.json({ error: 'Cargo shipment not found' }, { status: 404 })
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

    // Only platform admins can reactivate cancelled shipments
    if (existing.status === 'CANCELLED' && validated.data.status && context.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only platform admins can reactivate cancelled shipments' },
        { status: 403 }
      )
    }

    // Validate status transitions if status is being changed
    if (validated.data.status) {
      const allowedTransitions: Record<string, string[]> = {
        PENDING: ['IN_TRANSIT', 'CANCELLED'],
        IN_TRANSIT: ['CANCELLED'],
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
        ...(validated.data.status === 'IN_TRANSIT' && { deliveredAt: null }),
      },
      include: {
        label: {
          select: { id: true, deviceId: true, batteryPct: true, status: true },
        },
      },
    })

    return NextResponse.json({ shipment })
  } catch (error) {
    return handleApiError(error, 'updating cargo shipment')
  }
}

/**
 * DELETE /api/v1/cargo/[id] - Cancel cargo shipment
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const existing = await db.shipment.findUnique({ where: { id } })

    if (!existing || existing.type !== 'CARGO_TRACKING') {
      return NextResponse.json({ error: 'Cargo shipment not found' }, { status: 404 })
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
    return handleApiError(error, 'cancelling cargo shipment')
  }
}
