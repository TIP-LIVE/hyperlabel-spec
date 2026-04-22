import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createDispatchShipmentSchema } from '@/lib/validations/shipment'
import { generateShareCode } from '@/lib/utils/share-code'
import { getDispatchQuota } from '@/lib/dispatch-quota'

class DispatchError extends Error {
  constructor(public status: number, public body: Record<string, unknown>) {
    super(typeof body.error === 'string' ? body.error : 'Dispatch error')
  }
}

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
    const { name, originLat, originLng, destinationLat, destinationLng } = data
    const labelIds = [...new Set(data.labelIds)]

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

    // Compose destinationAddress from structured fields if not provided directly
    const rawDestAddr = data.destinationAddress?.trim() || null
    const composedAddr = [destinationLine1, destinationLine2, destinationCity, destinationState, destinationPostalCode, destinationCountry]
      .filter(Boolean)
      .join(', ')
    const destinationAddress = rawDestAddr || composedAddr || null

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

    // Single transaction: lock the Label rows, re-validate, then write.
    // The FOR UPDATE lock serializes concurrent dispatches of the same labels
    // so the uniqueness + quota checks can't be bypassed by a race.
    const shipment = await db.$transaction(async (tx) => {
      // Row lock on the label ids. Concurrent tx targeting the same labels waits here.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM labels WHERE id IN (${Prisma.join(labelIds)}) FOR UPDATE`)

      // Labels must belong to this org (via any OrderLabel.order.orgId match).
      // Scoping here also silently filters out cross-org ids — surfaced as "not found".
      const labels = await tx.label.findMany({
        where: {
          id: { in: labelIds },
          orderLabels: { some: { order: { orgId: context.orgId } } },
        },
        include: { orderLabels: { include: { order: true } } },
      })

      if (labels.length !== labelIds.length) {
        const foundIds = new Set(labels.map((l) => l.id))
        const missing = labelIds.filter((id) => !foundIds.has(id))
        throw new DispatchError(404, { error: 'Labels not found', missing })
      }

      const unavailable = labels.filter((l) => l.status !== 'SOLD' && l.status !== 'INVENTORY')
      if (unavailable.length > 0) {
        throw new DispatchError(400, {
          error: 'Some labels are not available for dispatch',
          labels: unavailable.map((l) => l.deviceId),
        })
      }

      // Uniqueness: block any label already in a non-cancelled dispatch.
      // DELIVERED is included — re-dispatching a delivered label would create a ghost row.
      const existingDispatch = await tx.shipmentLabel.findMany({
        where: {
          labelId: { in: labelIds },
          shipment: { status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] } },
        },
        include: { label: { select: { deviceId: true } } },
      })

      if (existingDispatch.length > 0) {
        throw new DispatchError(400, {
          error: 'Some labels are already in a dispatch',
          labels: existingDispatch.map((sl) => sl.label.deviceId),
        })
      }

      // Org quota — counts both attached labels AND admin-created blank
      // reservations (labelCount set, no shipmentLabels yet), so a user can't
      // grab a label an admin has already reserved against this order.
      const quota = await getDispatchQuota(tx, { orgId: context.orgId })

      if (labelIds.length > quota.remaining) {
        throw new DispatchError(400, {
          error: `Cannot dispatch ${labelIds.length} label${labelIds.length === 1 ? '' : 's'} — only ${quota.remaining} of ${quota.totalBought} purchased label${quota.totalBought === 1 ? '' : 's'} remaining`,
          quota,
        })
      }

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
    if (error instanceof DispatchError) {
      return NextResponse.json(error.body, { status: error.status })
    }
    return handleApiError(error, 'creating dispatch')
  }
}
