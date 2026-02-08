/**
 * Centralized status configuration for shipment and order statuses.
 * Single source of truth for labels, badge variants, and colors.
 */

// ────────────────────────────────────────
// Shipment statuses
// ────────────────────────────────────────

export type ShipmentStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'

export const shipmentStatusConfig: Record<
  ShipmentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' },
  DELIVERED: { label: 'Delivered', variant: 'outline' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
}

/** Admin dark-theme color classes for shipment status badges */
export const shipmentStatusStyles: Record<ShipmentStatus, string> = {
  PENDING: 'bg-gray-500/20 text-gray-400',
  IN_TRANSIT: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

// ────────────────────────────────────────
// Order statuses
// ────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export const orderStatusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  PAID: { label: 'Paid', variant: 'default' },
  SHIPPED: { label: 'Shipped', variant: 'default' },
  DELIVERED: { label: 'Delivered', variant: 'outline' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
}

/** Admin dark-theme color classes for order status badges */
export const orderStatusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-gray-500/20 text-gray-400',
  PAID: 'bg-yellow-500/20 text-yellow-400',
  SHIPPED: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}
