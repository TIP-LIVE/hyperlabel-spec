import { db } from '@/lib/db'

/**
 * UserPhase — the current state of a user's first-impression journey.
 *
 * 0 = Cold (no orders)
 * 1 = Paid, some labels not yet in any dispatch
 * 1b = Dispatch exists with blank receiver details (addressSubmittedAt == null)
 * 2 = Dispatch in transit (status PENDING with receiver details, or IN_TRANSIT)
 * 3 = Dispatch delivered, no cargo shipment yet referencing those labels
 * 4 = Cargo shipment exists but no LocationEvent yet (waiting for first signal)
 * 5 = Live cargo reporting
 */
export type UserPhase = 0 | 1 | '1b' | 2 | 3 | 4 | 5

export interface UserPhaseResult {
  phase: UserPhase
  latestOrder: {
    id: string
    quantity: number
    status: string
    createdAt: Date
    dispatchedCount: number
    undispatchedCount: number
  } | null
  pendingDispatches: Array<{
    id: string
    name: string | null
    status: string
    addressSubmittedAt: Date | null
    shareCode: string
    shareLinkExpiresAt: Date | null
    receiverFirstName: string | null
    receiverLastName: string | null
    consigneeEmail: string | null
    createdAt: Date
    labelCount: number
  }>
  activeCargoCount: number
  firstPendingCargoId: string | null
}

interface Args {
  userId: string
  orgId: string | null
}

/**
 * Resolve which phase of the onboarding journey a user is in.
 * Single entry-point called from /dashboard. Does all queries in parallel.
 */
export async function resolveUserPhase({ userId, orgId }: Args): Promise<UserPhaseResult> {
  const orderWhere = orgId ? { orgId } : { userId }
  const shipmentWhere = orgId ? { orgId } : { userId }

  const [latestOrderRow, dispatches, activeCargoCount, firstPendingCargo, hasReportingCargo] =
    await Promise.all([
      db.order.findFirst({
        where: { ...orderWhere, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          quantity: true,
          status: true,
          createdAt: true,
          orderLabels: {
            select: {
              label: {
                select: {
                  id: true,
                  shipmentLabels: {
                    where: { shipment: { type: 'LABEL_DISPATCH' } },
                    select: { shipmentId: true },
                  },
                },
              },
            },
          },
        },
      }),
      db.shipment.findMany({
        where: {
          ...shipmentWhere,
          type: 'LABEL_DISPATCH',
          status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] },
        },
        select: {
          id: true,
          name: true,
          status: true,
          addressSubmittedAt: true,
          shareCode: true,
          shareLinkExpiresAt: true,
          receiverFirstName: true,
          receiverLastName: true,
          consigneeEmail: true,
          createdAt: true,
          _count: { select: { shipmentLabels: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.shipment.count({
        where: {
          ...shipmentWhere,
          type: 'CARGO_TRACKING',
          status: { in: ['PENDING', 'IN_TRANSIT'] },
        },
      }),
      db.shipment.findFirst({
        where: {
          ...shipmentWhere,
          type: 'CARGO_TRACKING',
          status: 'PENDING',
          locations: { none: {} },
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      }),
      // Any active cargo that has already reported a location → user is fully onboarded
      db.shipment.findFirst({
        where: {
          ...shipmentWhere,
          type: 'CARGO_TRACKING',
          status: { in: ['PENDING', 'IN_TRANSIT'] },
          locations: { some: {} },
        },
        select: { id: true },
      }),
    ])

  // Compute undispatched count on the latest order
  let latestOrder: UserPhaseResult['latestOrder'] = null
  if (latestOrderRow) {
    let dispatchedCount = 0
    for (const ol of latestOrderRow.orderLabels) {
      if (ol.label.shipmentLabels.length > 0) dispatchedCount += 1
    }
    latestOrder = {
      id: latestOrderRow.id,
      quantity: latestOrderRow.quantity,
      status: latestOrderRow.status,
      createdAt: latestOrderRow.createdAt,
      dispatchedCount,
      undispatchedCount: latestOrderRow.orderLabels.length - dispatchedCount,
    }
  }

  const pendingDispatches = dispatches.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    addressSubmittedAt: d.addressSubmittedAt,
    shareCode: d.shareCode,
    shareLinkExpiresAt: d.shareLinkExpiresAt,
    receiverFirstName: d.receiverFirstName,
    receiverLastName: d.receiverLastName,
    consigneeEmail: d.consigneeEmail,
    createdAt: d.createdAt,
    labelCount: d._count.shipmentLabels,
  }))

  // Phase computation — ordered by priority (live state wins)
  let phase: UserPhase = 0

  if (hasReportingCargo) {
    // At least one active cargo is reporting → fully onboarded, hide journey
    phase = 5
  } else if (activeCargoCount > 0) {
    // Active cargo exists but none have reported yet → waiting for first signal
    phase = 4
  } else if (dispatches.some((d) => d.status === 'DELIVERED')) {
    // A dispatch has landed — user should be creating cargo shipments
    phase = 3
  } else if (
    dispatches.some(
      (d) => (d.status === 'PENDING' && d.addressSubmittedAt) || d.status === 'IN_TRANSIT'
    )
  ) {
    phase = 2
  } else if (dispatches.some((d) => d.status === 'PENDING' && !d.addressSubmittedAt)) {
    phase = '1b'
  } else if (latestOrder && latestOrder.undispatchedCount > 0) {
    phase = 1
  }

  return {
    phase,
    latestOrder,
    pendingDispatches,
    activeCargoCount,
    firstPendingCargoId: firstPendingCargo?.id ?? null,
  }
}
