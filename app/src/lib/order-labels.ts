import type { Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface TopUpResult {
  /** How many OrderLabel rows were created in this run */
  toppedUp: number
  /** How many slots are still missing (inventory empty for the remainder) */
  shortBy: number
}

/**
 * Pull from current INVENTORY to fill any gap between the order's quantity and
 * its existing OrderLabel rows. Atomic when run inside a $transaction.
 *
 * Used by:
 *   - admin dispatch creation (top up at the moment of dispatch)
 *   - one-shot /api/v1/admin/orders/[id]/top-up (manual catch-up)
 *
 * No-op if the order already has enough OrderLabels, or if INVENTORY is empty.
 */
export async function topUpOrderLabels(
  client: DbClient,
  order: { id: string; quantity: number },
): Promise<TopUpResult> {
  const existing = await client.orderLabel.count({ where: { orderId: order.id } })
  const needed = order.quantity - existing

  if (needed <= 0) {
    return { toppedUp: 0, shortBy: 0 }
  }

  const stock = await client.label.findMany({
    where: { status: 'INVENTORY', orderLabels: { none: {} } },
    take: needed,
    select: { id: true },
  })

  if (stock.length === 0) {
    return { toppedUp: 0, shortBy: needed }
  }

  await client.orderLabel.createMany({
    data: stock.map((l) => ({ orderId: order.id, labelId: l.id })),
    skipDuplicates: true,
  })
  await client.label.updateMany({
    where: { id: { in: stock.map((l) => l.id) } },
    data: { status: 'SOLD' },
  })

  return { toppedUp: stock.length, shortBy: needed - stock.length }
}
