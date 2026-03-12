import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { generateShareCode } from '@/lib/utils/share-code'
import {
  sendLabelActivatedNotification,
  sendConsigneeTrackingNotification,
} from '@/lib/notifications'

/** Validation schema for the public claim POST body */
const claimShipmentSchema = z.object({
  name: z.string().min(1, 'Cargo name is required').max(200),
  originAddress: z.string().default(''),
  originLat: z.number().min(-90).max(90).nullable().optional(),
  originLng: z.number().min(-180).max(180).nullable().optional(),
  destinationAddress: z.string().default(''),
  destinationLat: z.number().min(-90).max(90).nullable().optional(),
  destinationLng: z.number().min(-180).max(180).nullable().optional(),
  consigneeEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  consigneePhone: z.string().max(30).optional().or(z.literal('')),
  photoUrls: z.array(z.string()).max(5).optional(),
})

interface RouteContext {
  params: Promise<{ token: string }>
}

/**
 * GET /api/v1/claim/[token]
 *
 * Public endpoint — returns label info for the claim page.
 * No authentication required.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params

    const label = await db.label.findUnique({
      where: { claimToken: token },
      select: {
        id: true,
        deviceId: true,
        batteryPct: true,
        claimExpiresAt: true,
        firstUnlinkedReportAt: true,
        _count: {
          select: { locations: true },
        },
      },
    })

    if (!label) {
      return NextResponse.json({ error: 'Invalid or expired claim token' }, { status: 404 })
    }

    // Check if already claimed (label has an active shipment)
    const existingShipment = await db.shipment.findFirst({
      where: {
        labelId: label.id,
        status: { in: ['PENDING', 'IN_TRANSIT'] },
      },
    })

    if (existingShipment) {
      return NextResponse.json({
        error: 'Shipment already created for this label',
        shareCode: existingShipment.shareCode,
      }, { status: 409 })
    }

    const expired = label.claimExpiresAt ? new Date() > label.claimExpiresAt : false

    return NextResponse.json({
      deviceId: label.deviceId,
      batteryPct: label.batteryPct,
      locationCount: label._count.locations,
      firstReportAt: label.firstUnlinkedReportAt,
      claimExpiresAt: label.claimExpiresAt,
      expired,
    })
  } catch (error) {
    console.error('Error fetching claim info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/v1/claim/[token]
 *
 * Public endpoint — creates a shipment for an orphaned label.
 * No authentication required, but only works within the 24h claim window.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params

    const label = await db.label.findUnique({
      where: { claimToken: token },
      include: {
        orderLabels: {
          include: {
            order: {
              select: {
                userId: true,
                orgId: true,
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    })

    if (!label) {
      return NextResponse.json({ error: 'Invalid or expired claim token' }, { status: 404 })
    }

    // Check expiry
    if (label.claimExpiresAt && new Date() > label.claimExpiresAt) {
      return NextResponse.json(
        { error: 'Claim window has expired. Please log in to manage this shipment.' },
        { status: 403 }
      )
    }

    // Check if already claimed
    const existingShipment = await db.shipment.findFirst({
      where: {
        labelId: label.id,
        status: { in: ['PENDING', 'IN_TRANSIT'] },
      },
    })

    if (existingShipment) {
      return NextResponse.json({
        error: 'Shipment already created for this label',
        shareCode: existingShipment.shareCode,
      }, { status: 409 })
    }

    // Parse and validate body
    const body = await req.json()
    const validated = claimShipmentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const data = validated.data

    // Resolve owner from OrderLabel → Order
    const orderLabel = label.orderLabels[0]
    if (!orderLabel) {
      return NextResponse.json(
        { error: 'Cannot determine label owner' },
        { status: 400 }
      )
    }

    const ownerId = orderLabel.order.userId
    const orgId = orderLabel.order.orgId
    const ownerUser = orderLabel.order.user

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

    // Use a transaction to prevent race conditions:
    // Clear the claim token first (atomic guard), then create shipment.
    // If two requests race, only one will match the WHERE clause.
    const shipment = await db.$transaction(async (tx) => {
      // Atomically clear claim token — only succeeds if token still matches
      const updated = await tx.label.updateMany({
        where: { id: label.id, claimToken: token },
        data: { claimToken: null, claimExpiresAt: null },
      })

      if (updated.count === 0) {
        throw new Error('CLAIM_ALREADY_TAKEN')
      }

      // Create shipment
      const newShipment = await tx.shipment.create({
        data: {
          type: 'CARGO_TRACKING',
          name: data.name,
          originAddress,
          originLat: data.originLat ?? null,
          originLng: data.originLng ?? null,
          destinationAddress,
          destinationLat: data.destinationLat ?? null,
          destinationLng: data.destinationLng ?? null,
          shareCode,
          userId: ownerId,
          orgId,
          labelId: label.id,
          status: 'PENDING',
          consigneeEmail: data.consigneeEmail || null,
          consigneePhone: data.consigneePhone || null,
          photoUrls: data.photoUrls || [],
        },
      })

      // Backfill orphaned location events
      await tx.locationEvent.updateMany({
        where: { labelId: label.id, shipmentId: null },
        data: { shipmentId: newShipment.id },
      })

      return newShipment
    }).catch((err) => {
      if (err.message === 'CLAIM_ALREADY_TAKEN') return null
      throw err
    })

    if (!shipment) {
      return NextResponse.json({
        error: 'This label has already been claimed',
      }, { status: 409 })
    }

    // Send label activated notification to owner (fire and forget)
    sendLabelActivatedNotification({
      userId: ownerId,
      shipmentName: shipment.name || 'Unnamed Cargo',
      deviceId: label.deviceId,
      shareCode: shipment.shareCode,
    }).catch((err) => console.error('Failed to send activation notification:', err))

    // Send tracking link to consignee if email was provided
    if (data.consigneeEmail) {
      const senderName = ownerUser.firstName
        ? `${ownerUser.firstName}${ownerUser.lastName ? ' ' + ownerUser.lastName : ''}`
        : 'Someone'

      sendConsigneeTrackingNotification({
        consigneeEmail: data.consigneeEmail,
        shipmentName: shipment.name || 'Shipment',
        senderName,
        shareCode: shipment.shareCode,
        originAddress: shipment.originAddress,
        destinationAddress: shipment.destinationAddress,
      }).catch((err) => console.error('Failed to send consignee notification:', err))
    }

    return NextResponse.json({
      success: true,
      shipment: {
        id: shipment.id,
        shareCode: shipment.shareCode,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error claiming label:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
