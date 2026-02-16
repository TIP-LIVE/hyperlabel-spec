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
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build where clause scoped to organization
    const where = orgScopedWhere(context, status ? { status } : undefined)

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

    const { labelId, consigneeEmail, ...data } = validated.data

    // Verify label exists and belongs to user (via orderLabels -> order)
    const label = await db.label.findUnique({
      where: { id: labelId },
      include: {
        orderLabels: { include: { order: true } },
      },
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // Check if label is available for a new shipment
    if (label.status !== 'SOLD' && label.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Label is not available for shipment' },
        { status: 400 }
      )
    }

    // Check if label is already in an active shipment
    const existingShipment = await db.shipment.findFirst({
      where: {
        labelId: label.id,
        status: { in: ['PENDING', 'IN_TRANSIT'] },
      },
    })

    if (existingShipment) {
      return NextResponse.json(
        { error: 'Label is already assigned to an active shipment' },
        { status: 400 }
      )
    }

    // Generate unique share code
    let shareCode = generateShareCode()
    let attempts = 0
    while (attempts < 5) {
      const existing = await db.shipment.findUnique({ where: { shareCode } })
      if (!existing) break
      shareCode = generateShareCode()
      attempts++
    }

    // Create shipment
    const shipment = await db.shipment.create({
      data: {
        ...data,
        shareCode,
        userId: context.user.id,
        orgId: context.orgId,
        labelId: label.id,
        status: 'PENDING',
        consigneeEmail: consigneeEmail || null,
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

    // Update label status to ACTIVE if it was SOLD
    if (label.status === 'SOLD') {
      await db.label.update({
        where: { id: label.id },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      })
    }

    // Send label activated notification to shipper (fire and forget)
    sendLabelActivatedNotification({
      userId: context.user.id,
      shipmentName: shipment.name || 'Unnamed Shipment',
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
        originAddress: data.originAddress,
        destinationAddress: data.destinationAddress,
      }).catch((err) => console.error('Failed to send consignee notification:', err))
    }

    return NextResponse.json({ shipment }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating shipment')
  }
}
