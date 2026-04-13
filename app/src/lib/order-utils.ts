import { db } from './db'
import { sendOrderDeliveredNotification } from './notifications'
import { logger } from './logger'

/**
 * Check if all dispatches for an order are DELIVERED.
 * If so, cascade the order status to DELIVERED and notify the customer.
 *
 * Safe to call multiple times — no-ops if order is already DELIVERED
 * or if any dispatch is still in progress.
 */
export async function maybeCompleteOrder(orderId: string): Promise<boolean> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, userId: true, quantity: true },
  })

  if (!order || order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    return false
  }

  const dispatches = await db.shipment.findMany({
    where: { orderId, type: 'LABEL_DISPATCH' },
    select: { id: true, status: true },
  })

  // No dispatches yet — nothing to cascade
  if (dispatches.length === 0) return false

  // If any dispatch is not DELIVERED (or CANCELLED), order is not complete
  const activeDispatches = dispatches.filter((d) => d.status !== 'CANCELLED')
  if (activeDispatches.length === 0) return false

  const allDelivered = activeDispatches.every((d) => d.status === 'DELIVERED')
  if (!allDelivered) return false

  // All non-cancelled dispatches are delivered — cascade
  await db.order.update({
    where: { id: orderId },
    data: { status: 'DELIVERED' },
  })

  logger.info('Order auto-completed: all dispatches delivered', {
    orderId,
    dispatchCount: activeDispatches.length,
  })

  // Notify customer (fire-and-forget)
  sendOrderDeliveredNotification({
    userId: order.userId,
    orderNumber: orderId.slice(-8).toUpperCase(),
    quantity: order.quantity,
  }).catch((err) =>
    logger.error('Failed to send order-delivered notification', { orderId, error: err })
  )

  return true
}
