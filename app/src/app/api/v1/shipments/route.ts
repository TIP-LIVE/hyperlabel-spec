import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createShipmentSchema } from '@/lib/validations/shipment'
import { generateShareCode } from '@/lib/utils/share-code'
import { sendLabelActivatedNotification, sendConsigneeTrackingNotification } from '@/lib/notifications'

/**
 * GET /api/v1/shipments - List user's shipments
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    // Get query params for filtering
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build where clause scoped to organization
    const extraFilters: Record<string, unknown> = {}
    if (status) extraFilters.status = status
    if (type === 'CARGO_TRACKING' || type === 'LABEL_DISPATCH') extraFilters.type = type

    const where = orgScopedWhere(context, Object.keys(extraFilters).length > 0 ? extraFilters : undefined)

    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
        include: {
          label: {
            select: {
              id: true,
              deviceId: true,
              batteryPct: true,
              status: true,
            },
          },
          shipmentLabels: {
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
          },
          locations: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              latitude: true,
              longitude: true,
              recordedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.shipment.count({ where }),
    ])

    return NextResponse.json({
      shipments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + shipments.length < total,
      },
    })
  } catch (error) {
    return handleApiError(error, 'fetching shipments')
  }
}

/**
 * POST /api/v1/shipments - Create a new shipment
 *
 * Supports two types:
 * - CARGO_TRACKING: single label, track cargo (default)
 * - LABEL_DISPATCH: multiple labels, ship labels from warehouse
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const body = await req.json()
    const validated = createShipmentSchema.safeParse(body)

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

    if (data.type === 'LABEL_DISPATCH') {
      return await createLabelDispatch(data, { shareCode, originAddress, destinationAddress, context })
    }

    // CARGO_TRACKING flow (default)
    return await createCargoTracking(data, { shareCode, originAddress, destinationAddress, context })
  } catch (error) {
    return handleApiError(error, 'creating shipment')
  }
}

// ────────────────────────────────────────────────────────
// CARGO_TRACKING — single label, track cargo
// ────────────────────────────────────────────────────────

async function createCargoTracking(
  data: Extract<ReturnType<typeof createShipmentSchema.parse>, { type: 'CARGO_TRACKING' }>,
  opts: { shareCode: string; originAddress: string | null; destinationAddress: string | null; context: Awaited<ReturnType<typeof requireOrgAuth>> }
) {
  const { shareCode, originAddress, destinationAddress, context } = opts
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

  // Check if label is already in an active shipment
  const existingShipment = await db.shipment.findFirst({
    where: {
      labelId: label.id,
      status: { in: ['PENDING', 'IN_TRANSIT'] },
    },
  })

  if (existingShipment) {
    return NextResponse.json({ error: 'Label is already assigned to an active shipment' }, { status: 400 })
  }

  const shipment = await db.shipment.create({
    data: {
      type: 'CARGO_TRACKING',
      name,
      originAddress,
      originLat,
      originLng,
      destinationAddress,
      destinationLat,
      destinationLng,
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
        select: { id: true, deviceId: true, batteryPct: true, status: true },
      },
    },
  })

  // Update label status to ACTIVE if it was SOLD
  if (label.status === 'SOLD') {
    await db.label.update({
      where: { id: label.id },
      data: { status: 'ACTIVE', activatedAt: new Date() },
    })
  }

  // Send label activated notification to shipper (fire and forget)
  sendLabelActivatedNotification({
    userId: context.user.id,
    shipmentName: shipment.name || 'Unnamed Cargo',
    deviceId: label.deviceId,
    shareCode: shipment.shareCode,
  }).catch((err) => console.error('Failed to send activation notification:', err))

  // Send tracking link to consignee if email was provided
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
}

// ────────────────────────────────────────────────────────
// LABEL_DISPATCH — multiple labels, ship from warehouse
// ────────────────────────────────────────────────────────

async function createLabelDispatch(
  data: Extract<ReturnType<typeof createShipmentSchema.parse>, { type: 'LABEL_DISPATCH' }>,
  opts: { shareCode: string; originAddress: string | null; destinationAddress: string | null; context: Awaited<ReturnType<typeof requireOrgAuth>> }
) {
  const { shareCode, originAddress, destinationAddress, context } = opts
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

  // All labels must be SOLD or INVENTORY (they're physical labels being shipped)
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
        originLat,
        originLng,
        destinationAddress,
        destinationLat,
        destinationLng,
        shareCode,
        userId: context.user.id,
        orgId: context.orgId,
        status: 'PENDING',
      },
    })

    // Create ShipmentLabel entries
    await tx.shipmentLabel.createMany({
      data: labelIds.map((labelId) => ({
        shipmentId: s.id,
        labelId,
      })),
    })

    // Return with labels included
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
}
