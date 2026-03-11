import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateShipmentSchema } from '@/lib/validations/shipment'
import { syncLabelLocation } from '@/lib/sync-onomondo'
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
          orderBy: { recordedAt: 'desc' },
          take: 100,
        },
      },
    })

    if (!shipment || shipment.type !== 'CARGO_TRACKING') {
      return NextResponse.json({ error: 'Cargo shipment not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, shipment)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // On-demand sync
    let didSync = false
    const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'

    if (isActive && shipment.label?.iccid) {
      try {
        didSync = await Promise.race([
          syncLabelLocation(shipment.label),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 15000)),
        ])
      } catch (err) {
        console.warn('[on-demand sync] failed:', err instanceof Error ? err.message : err)
      }
    }

    // Backfill orphaned label locations
    let needsRefetch = didSync
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
          where: { shipmentId: shipment.id },
          orderBy: { recordedAt: 'desc' },
          take: 100,
        }))
      : shipment.locations

    const ungeocodedLocations = finalLocations.filter(
      (loc) => loc.latitude && loc.longitude && !isNullIsland(loc.latitude, loc.longitude) && (!loc.geocodedCity || !loc.geocodedArea)
    )
    // Await geocoding for the first few locations so the response includes geocoded names
    const urgent = ungeocodedLocations.slice(0, 5)
    const rest = ungeocodedLocations.slice(5)

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

    // Fire-and-forget the rest
    if (rest.length > 0) {
      ;(async () => {
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
      })().catch(() => {})
    }

    // Backfill origin/destination address from coordinates if missing
    const addressUpdates: Record<string, string> = {}
    const s = needsRefetch ? { ...shipment, locations: finalLocations } : shipment

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

    return NextResponse.json({ shipment: s })
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

    const shipment = await db.shipment.update({
      where: { id },
      data: {
        ...validated.data,
        ...(validated.data.status === 'DELIVERED' && { deliveredAt: new Date() }),
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

    await db.shipment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'cancelling cargo shipment')
  }
}
