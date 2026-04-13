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
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'; dotColor: string }
> = {
  PENDING: { label: 'Pending', variant: 'secondary', dotColor: 'bg-muted-foreground/30' },
  IN_TRANSIT: { label: 'In Transit', variant: 'default', dotColor: 'bg-green-500' },
  DELIVERED: { label: 'Delivered', variant: 'success', dotColor: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary', dotColor: 'bg-muted-foreground/30' },
}

/** Admin color classes for shipment status badges */
export const shipmentStatusStyles: Record<ShipmentStatus, string> = {
  PENDING: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  IN_TRANSIT: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-600 dark:text-green-400',
  CANCELLED: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
}

// ────────────────────────────────────────
// Order statuses
// ────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export const orderStatusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }
> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  PAID: { label: 'Paid', variant: 'default' },
  SHIPPED: { label: 'Shipped', variant: 'default' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
}

/** Admin color classes for order status badges */
export const orderStatusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  PAID: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  SHIPPED: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-600 dark:text-green-400',
  CANCELLED: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
}

// ────────────────────────────────────────
// Research lead statuses
// ────────────────────────────────────────

export type ResearchLeadStatus =
  | 'SOURCED'
  | 'CONTACTED'
  | 'SCREENED'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'ANALYSED'
  | 'DECLINED'
  | 'NO_SHOW'

export const researchLeadStatusConfig: Record<
  ResearchLeadStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }
> = {
  SOURCED: { label: 'Sourced', variant: 'secondary' },
  CONTACTED: { label: 'Contacted', variant: 'default' },
  SCREENED: { label: 'Screened', variant: 'default' },
  SCHEDULED: { label: 'Scheduled', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  ANALYSED: { label: 'Analysed', variant: 'success' },
  DECLINED: { label: 'Declined', variant: 'destructive' },
  NO_SHOW: { label: 'No Show', variant: 'destructive' },
}

/** Admin color classes for research lead status badges */
export const researchLeadStatusStyles: Record<ResearchLeadStatus, string> = {
  SOURCED: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  CONTACTED: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  SCREENED: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  SCHEDULED: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  COMPLETED: 'bg-green-500/20 text-green-600 dark:text-green-400',
  ANALYSED: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  DECLINED: 'bg-red-500/20 text-red-600 dark:text-red-400',
  NO_SHOW: 'bg-red-500/20 text-red-600 dark:text-red-400',
}

// ────────────────────────────────────────
// Research persona styles
// ────────────────────────────────────────

export type ResearchPersona = 'CONSIGNEE' | 'FORWARDER' | 'SHIPPER'

export const researchPersonaConfig: Record<
  ResearchPersona,
  { label: string }
> = {
  CONSIGNEE: { label: 'Consignee' },
  FORWARDER: { label: 'Forwarder' },
  SHIPPER: { label: 'Shipper' },
}

export const researchPersonaStyles: Record<ResearchPersona, string> = {
  CONSIGNEE: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
  FORWARDER: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  SHIPPER: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
}

// ────────────────────────────────────────
// Research script statuses
// ────────────────────────────────────────

export type ScriptStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED'

export const scriptStatusConfig: Record<
  ScriptStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }
> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  IN_REVIEW: { label: 'In Review', variant: 'default' },
  APPROVED: { label: 'Approved', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'secondary' },
}

export const scriptStatusStyles: Record<ScriptStatus, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  IN_REVIEW: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-600 dark:text-green-400',
  ARCHIVED: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
}
