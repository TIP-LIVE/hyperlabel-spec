import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createShipmentSchema } from '@/lib/validations/shipment'
import { generateShareCode } from '@/lib/utils/share-code'
import { isClerkConfigured } from '@/lib/clerk-config'

/**
 * GET /api/v1/shipments - List user's shipments
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user && isClerkConfigured()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build where clause
    const where: Record<string, unknown> = {}
    if (user) {
      where.userId = user.id
    }
    if (status) {
      where.status = status
    }

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
    console.error('Error fetching shipments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/v1/shipments - Create a new shipment
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validated = createShipmentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { labelId, ...data } = validated.data

    // Verify label exists and belongs to user (via order)
    const label = await db.label.findUnique({
      where: { id: labelId },
      include: {
        order: true,
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
        userId: user.id,
        labelId: label.id,
        status: 'PENDING',
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

    return NextResponse.json({ shipment }, { status: 201 })
  } catch (error) {
    console.error('Error creating shipment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
