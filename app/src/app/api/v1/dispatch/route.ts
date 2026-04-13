import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createDispatchShipmentSchema } from '@/lib/validations/shipment'
import { generateShareCode } from '@/lib/utils/share-code'

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
                  lastSeenAt: true,
                },
              },
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

    // Normalize receiver fields (empty string → null)
    const receiverFirstName = data.receiverFirstName?.trim() || null
    const receiverLastName = data.receiverLastName?.trim() || null
    const receiverEmail = data.receiverEmail?.trim() || null
    const receiverPhone = data.receiverPhone?.trim() || null
    const destinationLine1 = data.destinationLine1?.trim() || null
    const destinationLine2 = data.destinationLine2?.trim() || null
    const destinationCity = data.destinationCity?.trim() || null
    const destinationState = data.destinationState?.trim() || null
    const destinationPostalCode = data.destinationPostalCode?.trim() || null
    const destinationCountry = data.destinationCountry?.trim() || null

    // A dispatch is "complete" (ready to ship) when it has a receiver name +
    // address line1 + city + postal + country + email. Otherwise the buyer is
    // asking the receiver to fill in the rest via the public share link.
    const hasReceiverDetails = Boolean(
      data.askReceiver === false &&
        receiverFirstName &&
        receiverLastName &&
        destinationLine1 &&
        destinationCity &&
        destinationPostalCode &&
        destinationCountry &&
        receiverEmail,
    )
    const now = new Date()
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
    const shareLinkExpiresAt = hasReceiverDetails ? null : new Date(now.getTime() + FOURTEEN_DAYS_MS)
    const addressSubmittedAt = hasReceiverDetails ? now : null
    const destinationName = hasReceiverDetails && receiverFirstName && receiverLastName
      ? `${receiverFirstName} ${receiverLastName}`
      : null

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

    // Collect unique PAID order IDs from the labels being dispatched
    const paidOrderIds = [
      ...new Set(
        labels
          .flatMap((l) => l.orderLabels)
          .filter((ol) => ol.order.status === 'PAID')
          .map((ol) => ol.order.id)
      ),
    ]

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
          destinationName,
          destinationLine1,
          destinationLine2,
          destinationCity,
          destinationState,
          destinationPostalCode,
          destinationCountry,
          receiverFirstName,
          receiverLastName,
          consigneeEmail: receiverEmail,
          consigneePhone: receiverPhone,
          addressSubmittedAt,
          shareLinkExpiresAt,
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

      // Update associated orders: PAID → SHIPPED
      if (paidOrderIds.length > 0) {
        await tx.order.updateMany({
          where: { id: { in: paidOrderIds }, status: 'PAID' },
          data: { status: 'SHIPPED', shippedAt: new Date() },
        })
      }

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

    const shareLink = hasReceiverDetails ? null : `/track/${shareCode}`
    return NextResponse.json({ shipment, shareLink, awaitingReceiverDetails: !hasReceiverDetails }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating dispatch')
  }
}
