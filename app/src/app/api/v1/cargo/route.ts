import { NextRequest, NextResponse } from 'next/server'
import { db, VALID_LOCATION } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createCargoShipmentSchema } from '@/lib/validations/shipment'
import { generateShareCode } from '@/lib/utils/share-code'
import { sendLabelActivatedNotification, sendConsigneeTrackingNotification } from '@/lib/notifications'
import { reverseGeocodeToAddressLine } from '@/lib/geocoding'
import { isNullIsland } from '@/lib/validations/device'

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
              geocodedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.shipment.count({ where }),
    ])

    // NOTE: dashboard-load geocoding was removed — a parallel `Promise.all`
    // over up to `limit` events was bursting Nominatim past its 1 req/sec
    // policy, which caused its CDN to return wrong-coord responses and
    // poison geocoded_* fields across labels. New events are geocoded
    // synchronously in the webhook `after()` block; stragglers are handled
    // by the daily backfill-geocode cron. UI renders "Locating…" in the
    // meantime.

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

    let originAddress = data.originAddress?.trim() || null
    let destinationAddress = data.destinationAddress?.trim() || null
    const { labelId, consigneeEmail, consigneePhone, photoUrls, name, originLat, originLng, destinationLat, destinationLng } = data

    // Best-effort forward-enrichment: when the client supplied coords but no
    // address string (rare — most flows go through AddressInput which returns
    // both), reverse-geocode once at CREATE so the detail page never falls
    // back to raw lat/lng for the origin/destination labels. Failures are
    // swallowed — never block cargo creation on Nominatim flakiness.
    if (!originAddress && originLat != null && originLng != null && !isNullIsland(originLat, originLng)) {
      originAddress = await reverseGeocodeToAddressLine(originLat, originLng)
    }
    if (!destinationAddress && destinationLat != null && destinationLng != null && !isNullIsland(destinationLat, destinationLng)) {
      destinationAddress = await reverseGeocodeToAddressLine(destinationLat, destinationLng)
    }

    // Verify label exists
    const label = await db.label.findUnique({
      where: { id: labelId },
      include: {
        orderLabels: { include: { order: true } },
        // Include this org's delivered dispatches so we can accept labels that
        // are still INVENTORY but have physically been shipped to the user.
        // See the INVENTORY-drift note below.
        shipmentLabels: {
          where: {
            shipment: {
              orgId: context.orgId,
              type: 'LABEL_DISPATCH',
              status: 'DELIVERED',
            },
          },
          select: { shipmentId: true },
        },
      },
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // A label is eligible for cargo attachment if it's SOLD, ACTIVE, or
    // INVENTORY-but-has-a-delivered-dispatch-for-this-org. The third case
    // covers labels that were admin-dispatched without going through a
    // Stripe PAID order — they never got promoted to SOLD but are in the
    // user's hands. The dropdown already surfaces these (see
    // /api/v1/labels?status=SOLD filter); this guard was the last gate
    // rejecting them.
    const hasDeliveredDispatch = label.shipmentLabels.length > 0
    const isEligible =
      label.status === 'SOLD' ||
      label.status === 'ACTIVE' ||
      (label.status === 'INVENTORY' && hasDeliveredDispatch)

    if (!isEligible) {
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

      // Reclaim post-delivery events that the dispatch's 1h DELIVERED grace
      // window in `processLocationReport` attached to a now-completed
      // LABEL_DISPATCH. Once the user has created a cargo, those events
      // describe the user's location (not the courier's) and belong here.
      // Scope: events with recordedAt after the dispatch's deliveredAt — the
      // dispatch's actual transit history (recordedAt ≤ deliveredAt) stays
      // with the dispatch.
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentDeliveredDispatches = await tx.shipment.findMany({
        where: {
          type: 'LABEL_DISPATCH',
          status: 'DELIVERED',
          deliveredAt: { gte: oneHourAgo },
          shipmentLabels: { some: { labelId: label.id } },
        },
        select: { id: true, deliveredAt: true },
      })
      for (const d of recentDeliveredDispatches) {
        if (!d.deliveredAt) continue
        await tx.locationEvent.updateMany({
          where: {
            labelId: label.id,
            shipmentId: d.id,
            recordedAt: { gt: d.deliveredAt },
          },
          data: { shipmentId: s.id },
        })
      }

      if (label.status === 'SOLD' || label.status === 'INVENTORY') {
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
