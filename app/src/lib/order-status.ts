import { db } from './db'
import { logger } from './logger'

/**
 * Keep Order.status in sync with its labels' dispatch state.
 *
 * Rule: Order is SHIPPED iff every OrderLabel is in a LABEL_DISPATCH whose
 * status is IN_TRANSIT or DELIVERED (i.e. physically leaving/left the
 * warehouse). Otherwise the order stays/reverts to PAID.
 *
 * Call this whenever a dispatch's membership or status changes (create is
 * intentionally excluded — a PENDING dispatch hasn't moved anything yet).
 */
export type OrderStatusChange = {
  orderId: string
  userId: string
  quantity: number
  from: 'PAID' | 'SHIPPED'
  to: 'PAID' | 'SHIPPED'
}

export async function reconcileOrderShipmentStatus(
  orderIds: string[]
): Promise<OrderStatusChange[]> {
  const uniqueIds = [...new Set(orderIds)]
  const changes: OrderStatusChange[] = []

  for (const orderId of uniqueIds) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        quantity: true,
        status: true,
        orderLabels: {
          select: {
            label: {
              select: {
                shipmentLabels: {
                  where: {
                    shipment: {
                      type: 'LABEL_DISPATCH',
                      status: { in: ['IN_TRANSIT', 'DELIVERED'] },
                    },
                  },
                  select: { shipmentId: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!order) continue
    if (order.orderLabels.length === 0) continue

    const allInFlight = order.orderLabels.every((ol) => ol.label.shipmentLabels.length > 0)
    const onlyPaidOrShipped = order.status === 'PAID' || order.status === 'SHIPPED'
    if (!onlyPaidOrShipped) continue

    if (allInFlight && order.status === 'PAID') {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'SHIPPED', shippedAt: new Date() },
      })
      logger.info('Order auto-transitioned PAID→SHIPPED', { orderId: order.id })
      changes.push({
        orderId: order.id,
        userId: order.userId,
        quantity: order.quantity,
        from: 'PAID',
        to: 'SHIPPED',
      })
    } else if (!allInFlight && order.status === 'SHIPPED') {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'PAID', shippedAt: null },
      })
      logger.info('Order auto-reverted SHIPPED→PAID', { orderId: order.id })
      changes.push({
        orderId: order.id,
        userId: order.userId,
        quantity: order.quantity,
        from: 'SHIPPED',
        to: 'PAID',
      })
    }
  }

  return changes
}

/**
 * Collect every order that could be affected by a dispatch's state change.
 * Covers both the new orderId FK and the legacy ShipmentLabel→OrderLabel chain.
 */
export async function collectOrderIdsForDispatch(shipment: {
  id: string
  orderId: string | null
}): Promise<string[]> {
  const orderIds = new Set<string>()
  if (shipment.orderId) orderIds.add(shipment.orderId)

  const shipmentLabels = await db.shipmentLabel.findMany({
    where: { shipmentId: shipment.id },
    select: { label: { select: { orderLabels: { select: { orderId: true } } } } },
  })
  for (const sl of shipmentLabels) {
    for (const ol of sl.label.orderLabels) {
      orderIds.add(ol.orderId)
    }
  }

  return [...orderIds]
}
