import type { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

type DbClient = PrismaClient | Prisma.TransactionClient

export type DispatchScope = { orgId: string } | { userId: string }

// An org "reserves" a purchased label slot by having it sit in an active
// LABEL_DISPATCH. There are two valid reservation shapes:
//   - shipmentLabels attached (user-created dispatches, or admin-scanned ones)
//   - labelCount set but no shipmentLabels yet (admin-created blank dispatches
//     waiting for scan — the reservation holds the slot until scan or expiry)
// Counting shipmentLabels alone misses the blank-reservation case and lets the
// org double-book labels. Always use this helper for quota math.
export async function countActivelyDispatched(
  client: DbClient,
  scope: DispatchScope,
  excludeShipmentId?: string,
): Promise<number> {
  const where: Prisma.ShipmentWhereInput = {
    ...scope,
    type: 'LABEL_DISPATCH',
    status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] },
  }
  if (excludeShipmentId) {
    where.id = { not: excludeShipmentId }
  }

  const active = await client.shipment.findMany({
    where,
    select: {
      labelCount: true,
      _count: { select: { shipmentLabels: true } },
    },
  })

  return active.reduce(
    (sum, s) => sum + Math.max(s.labelCount ?? 0, s._count.shipmentLabels),
    0,
  )
}

export async function getDispatchQuota(
  client: DbClient,
  scope: DispatchScope,
  excludeShipmentId?: string,
): Promise<{ totalBought: number; activelyDispatched: number; remaining: number }> {
  const [purchasedResult, activelyDispatched] = await Promise.all([
    client.order.aggregate({
      where: {
        ...scope,
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        totalAmount: { gt: 0 },
      },
      _sum: { quantity: true },
    }),
    countActivelyDispatched(client, scope, excludeShipmentId),
  ])

  const totalBought = purchasedResult._sum.quantity ?? 0
  const remaining = Math.max(0, totalBought - activelyDispatched)
  return { totalBought, activelyDispatched, remaining }
}

export async function getDispatchQuotaForOrg(
  orgId: string,
  excludeShipmentId?: string,
) {
  return getDispatchQuota(db, { orgId }, excludeShipmentId)
}
