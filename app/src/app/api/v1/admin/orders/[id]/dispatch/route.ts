import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { generateShareCode } from '@/lib/utils/share-code'
import { getDispatchQuota } from '@/lib/dispatch-quota'
import { topUpOrderLabels } from '@/lib/order-labels'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createDispatchSchema = z.object({
  name: z.string().min(1).max(200),
  labelCount: z.number().int().min(1),
  askReceiver: z.boolean().optional().default(false),
  receiverFirstName: z.string().max(100).optional().or(z.literal('')),
  receiverLastName: z.string().max(100).optional().or(z.literal('')),
  receiverEmail: z.string().email().optional().or(z.literal('')),
  receiverPhone: z.string().max(30).optional().or(z.literal('')),
  destinationAddress: z.string().optional().default(''),
  destinationLat: z.number().min(-90).max(90).nullable().optional(),
  destinationLng: z.number().min(-180).max(180).nullable().optional(),
  destinationLine1: z.string().max(300).optional().or(z.literal('')),
  destinationLine2: z.string().max(300).optional().or(z.literal('')),
  destinationCity: z.string().max(100).optional().or(z.literal('')),
  destinationState: z.string().max(100).optional().or(z.literal('')),
  destinationPostalCode: z.string().max(20).optional().or(z.literal('')),
  destinationCountry: z.string().length(2).optional().or(z.literal('')),
})

/**
 * GET /api/v1/admin/orders/[id]/dispatch
 * List dispatches for an order
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Find dispatches linked to this order directly (new flow)
    // plus legacy dispatches linked via ShipmentLabel
    const directDispatches = await db.shipment.findMany({
      where: { orderId: id, type: 'LABEL_DISPATCH' },
      include: {
        shipmentLabels: {
          include: {
            label: {
              select: { id: true, deviceId: true, status: true, batteryPct: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Also find legacy dispatches via ShipmentLabel (for backwards compat)
    const orderLabels = await db.orderLabel.findMany({
      where: { orderId: id },
      select: { labelId: true },
    })
    const labelIds = orderLabels.map((ol) => ol.labelId)

    let legacyDispatches: typeof directDispatches = []
    if (labelIds.length > 0) {
      const shipmentLabels = await db.shipmentLabel.findMany({
        where: { labelId: { in: labelIds } },
        select: { shipmentId: true },
      })
      const legacyIds = [...new Set(shipmentLabels.map((sl) => sl.shipmentId))]
      const directIds = new Set(directDispatches.map((d) => d.id))
      const onlyLegacyIds = legacyIds.filter((sid) => !directIds.has(sid))

      if (onlyLegacyIds.length > 0) {
        legacyDispatches = await db.shipment.findMany({
          where: { id: { in: onlyLegacyIds }, type: 'LABEL_DISPATCH' },
          include: {
            shipmentLabels: {
              include: {
                label: {
                  select: { id: true, deviceId: true, status: true, batteryPct: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      }
    }

    const dispatches = [...directDispatches, ...legacyDispatches]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json({ dispatches })
  } catch (error) {
    return handleApiError(error, 'fetching order dispatches')
  }
}

/**
 * POST /api/v1/admin/orders/[id]/dispatch
 * Create a label dispatch for an order (admin only).
 * Labels are NOT pre-assigned — they get linked when admin scans them at ship time.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = createDispatchSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { name, labelCount, askReceiver } = validated.data

    // Normalize empty strings → null
    const norm = (v: string | undefined | null) => (v?.trim() || null)
    const receiverFirstName = norm(validated.data.receiverFirstName)
    const receiverLastName = norm(validated.data.receiverLastName)
    const receiverEmail = norm(validated.data.receiverEmail)
    const receiverPhone = norm(validated.data.receiverPhone)
    const destinationLine1 = norm(validated.data.destinationLine1)
    const destinationLine2 = norm(validated.data.destinationLine2)
    const destinationCity = norm(validated.data.destinationCity)
    const destinationState = norm(validated.data.destinationState)
    const destinationPostalCode = norm(validated.data.destinationPostalCode)
    const destinationCountry = norm(validated.data.destinationCountry)
    const destinationLat = validated.data.destinationLat ?? null
    const destinationLng = validated.data.destinationLng ?? null

    // Compose destinationAddress from structured fields if not provided directly
    const rawDestAddr = norm(validated.data.destinationAddress)
    const composedAddr = [destinationLine1, destinationLine2, destinationCity, destinationState, destinationPostalCode, destinationCountry]
      .filter(Boolean)
      .join(', ')
    const destinationAddress = rawDestAddr || composedAddr || null

    const hasReceiverDetails = Boolean(
      !askReceiver &&
        receiverFirstName &&
        receiverLastName &&
        destinationLine1 &&
        destinationCity &&
        destinationPostalCode &&
        destinationCountry &&
        receiverEmail,
    )
    const destinationName = hasReceiverDetails
      ? `${receiverFirstName} ${receiverLastName}`
      : null
    const addressSubmittedAt = hasReceiverDetails ? new Date() : null
    const shareLinkExpiresAt = hasReceiverDetails
      ? null
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
        orgId: true,
        quantity: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'PAID' && order.status !== 'SHIPPED') {
      return NextResponse.json(
        { error: 'Only paid or shipped orders can have dispatches created' },
        { status: 400 }
      )
    }

    // Org-level quota: aggregates across every active LABEL_DISPATCH for this
    // org — counts both shipmentLabels rows AND labelCount reservations. A
    // per-order labelCount sum misses dispatches without an orderId or with
    // only shipmentLabels attached (e.g. anything created via /api/v1/dispatch),
    // which lets the org double-book purchased slots.
    const scope = order.orgId ? { orgId: order.orgId } : { userId: order.userId }
    const quota = await getDispatchQuota(db, scope)

    if (labelCount > quota.remaining) {
      return NextResponse.json(
        {
          error: `Cannot dispatch ${labelCount} label${labelCount === 1 ? '' : 's'} — only ${quota.remaining} of ${quota.totalBought} purchased label${quota.totalBought === 1 ? '' : 's'} remaining`,
          quota,
        },
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

    // Top up OrderLabels if the order is short, then create the dispatch in one
    // transaction. Orders can end up under-filled when inventory was empty at
    // mark-paid / Stripe-allocation time — `LowInventoryAlert` fires but no
    // automatic top-up runs later, so the buyer's order is "owed" labels that
    // were never allocated. Without this, Scan & Ship's Browse list is empty
    // and admin has to register/assign labels in a separate flow first.
    const { shipment, toppedUp, shortBy } = await db.$transaction(async (tx) => {
      const result = await topUpOrderLabels(tx, { id: order.id, quantity: order.quantity })

      // Create dispatch shipment (no ShipmentLabel entries — labels linked at scan time).
      // Order stays PAID until labels are actually scanned via verify-labels — a dispatch
      // container existing doesn't mean anything physically shipped yet.
      const created = await tx.shipment.create({
        data: {
          type: 'LABEL_DISPATCH',
          name,
          shareCode,
          userId: order.userId,
          orgId: order.orgId,
          orderId: order.id,
          labelCount,
          status: 'PENDING',
          destinationAddress,
          destinationLat,
          destinationLng,
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
        },
      })

      return { shipment: created, ...result }
    })

    const shareLink = hasReceiverDetails ? null : `/track/${shipment.shareCode}`
    return NextResponse.json(
      {
        shipment,
        shareLink,
        awaitingReceiverDetails: !hasReceiverDetails,
        allocation: { toppedUp, shortBy },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error, 'creating dispatch for order')
  }
}
