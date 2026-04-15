import { render } from '@react-email/components'
import { createClerkClient } from '@clerk/backend'
import { isEmailConfigured, sendEmail, type EmailType } from './email'
import { db } from './db'
import { reverseGeocode } from './geocoding'
import LabelActivatedEmail from '@/emails/label-activated'
import LabelOrphanedEmail from '@/emails/label-orphaned'
import AutoShipmentCreatedEmail from '@/emails/auto-shipment-created'
import LowBatteryEmail from '@/emails/low-battery'
import NoSignalEmail from '@/emails/no-signal'
import ShipmentDeliveredEmail from '@/emails/shipment-delivered'
import ShipmentStuckEmail from '@/emails/shipment-stuck'
import OrderShippedEmail from '@/emails/order-shipped'
import OrderConfirmedEmail from '@/emails/order-confirmed'
import LowInventoryEmail from '@/emails/low-inventory'
import RoleChangedEmail from '@/emails/role-changed'
import UnusedLabelsReminderEmail from '@/emails/unused-labels-reminder'
import PendingShipmentReminderEmail from '@/emails/pending-shipment-reminder'
import ShipmentStatusDigestEmail, {
  type DigestShipmentItem,
} from '@/emails/shipment-status-digest'
import ConsigneeTrackingEmail from '@/emails/consignee-tracking'
import ConsigneeInTransitEmail from '@/emails/consignee-in-transit'
import ConsigneeDeliveredEmail from '@/emails/consignee-delivered'
import DispatchDetailsRequestedEmail from '@/emails/dispatch-details-requested'
import DispatchDetailsSubmittedEmail from '@/emails/dispatch-details-submitted'
import DispatchInTransitEmail from '@/emails/dispatch-in-transit'
import DispatchDeliveredEmail from '@/emails/dispatch-delivered'
import DispatchCancelledEmail from '@/emails/dispatch-cancelled'
import DispatchAddressConfirmedEmail from '@/emails/dispatch-address-confirmed'
import OrderDeliveredEmail from '@/emails/order-delivered'
import { format } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'

interface LocationForEmail {
  lat: number
  lng: number
  geocodedCity?: string | null
  geocodedArea?: string | null
  geocodedCountry?: string | null
}

// Format coordinates into a human-readable location string.
// Prefers geocoded fields already stored on the LocationEvent (populated at
// ingest by the webhook handler's deferred geocoder). Only calls Nominatim as
// a last resort for legacy callers passing raw coords. Coordinates are the
// final fallback when everything else fails.
async function formatLocation(loc: LocationForEmail): Promise<string> {
  const stored = [loc.geocodedArea, loc.geocodedCity, loc.geocodedCountry].filter(Boolean)
  if (stored.length > 0) return stored.join(', ')

  try {
    const geo = await reverseGeocode(loc.lat, loc.lng)
    if (geo) {
      const parts = [geo.area, geo.city, geo.country].filter(Boolean)
      if (parts.length > 0) return parts.join(', ')
    }
  } catch {
    // Fall through to coordinate fallback
  }
  return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
}

const PREF_FIELD_BY_TYPE: Record<EmailType, 'notifyLabelActivated' | 'notifyLowBattery' | 'notifyNoSignal' | 'notifyDelivered' | 'notifyOrderShipped' | 'notifyShipmentStuck' | 'notifyReminders'> = {
  label_activated: 'notifyLabelActivated',
  low_battery: 'notifyLowBattery',
  no_signal: 'notifyNoSignal',
  shipment_delivered: 'notifyDelivered',
  order_shipped: 'notifyOrderShipped',
  shipment_stuck: 'notifyShipmentStuck',
  reminders: 'notifyReminders',
  // Digest rides on the same "reminders" kill-switch as the legacy cron emails
  // — if a user has turned reminders off entirely, no digest either.
  shipment_status_digest: 'notifyReminders',
}

// Check if user has enabled a specific notification type
async function shouldSendNotification(
  userId: string,
  emailType: EmailType
): Promise<{ enabled: boolean; email: string | null }> {
  if (!isEmailConfigured()) return { enabled: false, email: null }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      notifyLabelActivated: true,
      notifyLowBattery: true,
      notifyNoSignal: true,
      notifyDelivered: true,
      notifyOrderShipped: true,
      notifyShipmentStuck: true,
      notifyReminders: true,
    },
  })

  if (!user?.email) {
    return { enabled: false, email: null }
  }

  return { enabled: user[PREF_FIELD_BY_TYPE[emailType]], email: user.email }
}

/**
 * Fetch Clerk user IDs for all members of an organization.
 * Returns empty array if Clerk is not configured or fetch fails.
 */
async function getOrgMemberClerkIds(orgId: string): Promise<string[]> {
  if (!process.env.CLERK_SECRET_KEY) return []
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const { data } = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    })
    return data
      .map((m) => m.publicUserData?.userId)
      .filter((id): id is string => Boolean(id))
  } catch (err) {
    console.error('[Notifications] Failed to fetch org members:', err)
    return []
  }
}

export type NotificationRecipient = { userId: string; email: string }

/**
 * Resolve the list of users who should receive a notification for a shipment.
 *
 * - If `orgId` is set: returns all members of the org (from Clerk) whose DB
 *   preference for this email type is enabled, plus the owner as a fallback.
 * - If `orgId` is null: returns just the owner (personal ownership).
 *
 * All returned users have email and the relevant preference enabled.
 */
async function resolveRecipients(
  ownerUserId: string,
  orgId: string | null | undefined,
  emailType: EmailType
): Promise<NotificationRecipient[]> {
  if (!isEmailConfigured()) return []

  const prefField = PREF_FIELD_BY_TYPE[emailType]

  if (!orgId) {
    const { enabled, email } = await shouldSendNotification(ownerUserId, emailType)
    if (!enabled || !email) return []
    return [{ userId: ownerUserId, email }]
  }

  const clerkIds = await getOrgMemberClerkIds(orgId)

  const users = await db.user.findMany({
    where: {
      OR: [
        { id: ownerUserId },
        ...(clerkIds.length > 0 ? [{ clerkId: { in: clerkIds } }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      notifyLabelActivated: true,
      notifyLowBattery: true,
      notifyNoSignal: true,
      notifyDelivered: true,
      notifyOrderShipped: true,
      notifyShipmentStuck: true,
      notifyReminders: true,
    },
  })

  const seen = new Set<string>()
  const recipients: NotificationRecipient[] = []
  for (const u of users) {
    if (seen.has(u.id)) continue
    seen.add(u.id)
    if (!u.email) continue
    if (!u[prefField]) continue
    recipients.push({ userId: u.id, email: u.email })
  }
  return recipients
}

// Record notification in database (one row per recipient so per-user inbox works)
async function recordNotification(
  userId: string,
  type: string,
  metadata: Record<string, unknown>,
  orgId?: string | null
): Promise<void> {
  await db.notification.create({
    data: {
      userId,
      orgId: orgId ?? null,
      type,
      message: JSON.stringify(metadata),
    },
  })
}

/**
 * Send label activated notification
 */
export async function sendLabelActivatedNotification(params: {
  userId: string
  orgId?: string | null
  shipmentName: string
  deviceId: string
  shareCode: string
  shipmentId?: string
}): Promise<void> {
  const recipients = await resolveRecipients(params.userId, params.orgId, 'label_activated')
  if (recipients.length === 0) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const createdAt = format(new Date(), 'PPpp')

  const html = await render(
    LabelActivatedEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      trackingUrl,
      createdAt,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `Cargo Shipment Created: ${params.shipmentName}`,
      html,
    })
    await recordNotification(r.userId, 'label_activated', {
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      shipmentId: params.shipmentId,
    }, params.orgId)
  }
}

/**
 * Send low battery notification
 */
export async function sendLowBatteryNotification(params: {
  userId: string
  orgId?: string | null
  shipmentId?: string
  shipmentName: string
  deviceId: string
  shareCode: string
  batteryLevel: number
}): Promise<void> {
  const recipients = await resolveRecipients(params.userId, params.orgId, 'low_battery')
  if (recipients.length === 0) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`

  const html = await render(
    LowBatteryEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      batteryLevel: params.batteryLevel,
      trackingUrl,
    })
  )

  const subject =
    params.batteryLevel <= 10
      ? `⚠️ Critical Battery: ${params.shipmentName}`
      : `🔋 Low Battery: ${params.shipmentName}`

  for (const r of recipients) {
    await sendEmail({ to: r.email, subject, html })
    await recordNotification(r.userId, 'low_battery', {
      shipmentName: params.shipmentName,
      batteryLevel: params.batteryLevel,
      shipmentId: params.shipmentId,
      threshold: params.batteryLevel <= 10 ? 'critical_10' : 'warning_20',
    }, params.orgId)
  }
}

/**
 * Send no signal notification
 */
export async function sendNoSignalNotification(params: {
  userId: string
  orgId?: string | null
  shipmentId?: string
  shipmentName: string
  deviceId: string
  shareCode: string
  lastSeenAt: Date
  lastLocation?: LocationForEmail
  thresholdHours: number
}): Promise<void> {
  const recipients = await resolveRecipients(params.userId, params.orgId, 'no_signal')
  if (recipients.length === 0) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`

  const html = await render(
    NoSignalEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      lastSeenAt: format(params.lastSeenAt, 'PPpp'),
      lastLocation: params.lastLocation
        ? await formatLocation(params.lastLocation)
        : undefined,
      trackingUrl,
      thresholdHours: params.thresholdHours,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `📡 No Signal: ${params.shipmentName}`,
      html,
    })
    await recordNotification(r.userId, 'no_signal', {
      shipmentName: params.shipmentName,
      lastSeenAt: params.lastSeenAt.toISOString(),
      shipmentId: params.shipmentId,
      thresholdHours: params.thresholdHours,
    }, params.orgId)
  }
}

/**
 * Send shipment delivered notification
 */
export async function sendShipmentDeliveredNotification(params: {
  userId: string
  orgId?: string | null
  shipmentId?: string
  shipmentName: string
  deviceId: string
  shareCode: string
  destination: string
  source?: 'auto' | 'manual'
}): Promise<void> {
  const recipients = await resolveRecipients(params.userId, params.orgId, 'shipment_delivered')
  if (recipients.length === 0) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const deliveredAt = format(new Date(), 'PPpp')

  const html = await render(
    ShipmentDeliveredEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      deliveredAt,
      destination: params.destination,
      trackingUrl,
      source: params.source ?? 'auto',
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `✅ Delivered: ${params.shipmentName}`,
      html,
    })
    await recordNotification(r.userId, 'shipment_delivered', {
      shipmentName: params.shipmentName,
      destination: params.destination,
      shipmentId: params.shipmentId,
    }, params.orgId)
  }
}

/**
 * Send order shipped notification
 */
export async function sendOrderShippedNotification(params: {
  userId: string
  orderNumber: string
  quantity: number
  trackingNumber?: string
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'order_shipped')
  if (!enabled || !email) return

  const dashboardUrl = `${APP_URL}/dashboard`

  const html = await render(
    OrderShippedEmail({
      orderNumber: params.orderNumber,
      quantity: params.quantity,
      trackingNumber: params.trackingNumber,
      trackingUrl: params.trackingNumber
        ? `https://track.aftership.com/${params.trackingNumber}`
        : undefined,
      dashboardUrl,
    })
  )

  await sendEmail({
    to: email,
    subject: `📦 Order #${params.orderNumber} Has Shipped!`,
    html,
  })

  await recordNotification(params.userId, 'order_shipped', {
    orderNumber: params.orderNumber,
    quantity: params.quantity,
  })
}

/**
 * Send order delivered notification (all dispatches arrived)
 */
export async function sendOrderDeliveredNotification(params: {
  userId: string
  orderNumber: string
  quantity: number
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'shipment_delivered')
  if (!enabled || !email) return

  const dashboardUrl = `${APP_URL}/dashboard`

  const html = await render(
    OrderDeliveredEmail({
      orderNumber: params.orderNumber,
      quantity: params.quantity,
      dashboardUrl,
    })
  )

  await sendEmail({
    to: email,
    subject: `Your TIP labels from order #${params.orderNumber} have been delivered`,
    html,
  })

  await recordNotification(params.userId, 'shipment_delivered', {
    orderNumber: params.orderNumber,
    quantity: params.quantity,
  })
}

/**
 * Send order confirmed notification (after successful payment)
 */
export async function sendOrderConfirmedNotification(params: {
  userId: string
  orderNumber: string
  quantity: number
  totalAmount: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  // Order confirmation always sends — no preference toggle needed
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true },
  })

  if (!user?.email) return

  const dashboardUrl = `${APP_URL}/dashboard`

  const html = await render(
    OrderConfirmedEmail({
      orderNumber: params.orderNumber,
      quantity: params.quantity,
      totalAmount: params.totalAmount,
      dashboardUrl,
    })
  )

  await sendEmail({
    to: user.email,
    subject: `✅ Order Confirmed — ${params.quantity} Tracking Label${params.quantity > 1 ? 's' : ''}`,
    html,
  })

  await recordNotification(params.userId, 'order_confirmed', {
    orderNumber: params.orderNumber,
    quantity: params.quantity,
  })
}

/**
 * Send share link / unused label reminder notification
 */
export async function sendShareLinkReminderNotification(params: {
  userId: string
  reminderType: 'unused_labels' | 'pending_shipment'
  labelCount?: number
  deviceIds: string[]
  shipmentName?: string
  shareCode?: string
  /** Days elapsed since effective readiness (cargo createdAt or dispatch deliveredAt). Used for branched copy. */
  daysSinceReady?: number
  /** True if the label was dispatched via TIP and that dispatch is DELIVERED. */
  dispatchDelivered?: boolean
  /** When the dispatch was delivered, if applicable. */
  dispatchDeliveredAt?: Date | null
  /** Receiver name from the dispatch (firstName + lastName, or destinationName). */
  receiverName?: string | null
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'reminders')
  if (!enabled || !email) return

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { firstName: true },
  })

  const name = user?.firstName || 'there'

  let subject: string
  let html: string

  if (params.reminderType === 'unused_labels') {
    subject = `📋 You have ${params.labelCount} purchased label${params.labelCount === 1 ? '' : 's'} waiting for the next step`
    const dashboardUrl = `${APP_URL}/dashboard`
    html = await render(
      UnusedLabelsReminderEmail({
        userName: name,
        labelCount: params.labelCount || 0,
        deviceIds: params.deviceIds,
        dashboardUrl,
      })
    )
  } else {
    const trackingUrl = params.shareCode ? `${APP_URL}/track/${params.shareCode}` : `${APP_URL}/dashboard`
    const shipmentName = params.shipmentName || 'Unknown'
    subject = `We haven't heard from "${shipmentName}" yet`
    html = await render(
      PendingShipmentReminderEmail({
        userName: name,
        shipmentName,
        trackingUrl,
        daysSinceReady: params.daysSinceReady,
        dispatchDelivered: params.dispatchDelivered,
        dispatchDeliveredAt: params.dispatchDeliveredAt
          ? format(params.dispatchDeliveredAt, 'MMM d, yyyy')
          : undefined,
        receiverName: params.receiverName ?? undefined,
      })
    )
  }

  await sendEmail({ to: email, subject, html })

  await recordNotification(params.userId, params.reminderType === 'unused_labels' ? 'unused_label_reminder' : 'pending_shipment_reminder', {
    reminderType: params.reminderType,
    labelCount: params.labelCount,
    shipmentName: params.shipmentName,
    shipmentId: params.shareCode,
    daysSinceReady: params.daysSinceReady,
  })
}

/**
 * Send the consolidated daily/weekly shipment status digest.
 * One email per user summarising every shipment that needs attention.
 *
 * Cadence and per-shipment backoff are enforced by the caller
 * (app/src/app/api/cron/shipment-digest/route.ts). This function just
 * renders + sends + records.
 */
export async function sendShipmentStatusDigest(params: {
  userId: string
  userEmail: string
  userName: string
  cadence: 'DAILY' | 'WEEKLY'
  pending: Array<{
    shipmentId: string
    name: string
    shareCode: string
    createdAt: Date
  }>
  silent: Array<{
    shipmentId: string
    name: string
    shareCode: string
    lastSeenAt: Date
    lastLocation?: {
      city: string | null
      area: string | null
      country: string | null
    }
  }>
  stuck: Array<{
    shipmentId: string
    name: string
    shareCode: string
    stuckSinceHours: number
    lastLocation?: {
      city: string | null
      area: string | null
      country: string | null
    }
  }>
  unusedCount: number
}): Promise<void> {
  if (!isEmailConfigured()) return

  const totalShipments =
    params.pending.length + params.silent.length + params.stuck.length
  const totalItems = totalShipments + (params.unusedCount > 0 ? 1 : 0)
  if (totalItems === 0) return

  const cadenceLabel = params.cadence === 'WEEKLY' ? "This week's" : "Today's"
  const dashboardUrl = `${APP_URL}/dashboard`
  const preferencesUrl = `${APP_URL}/settings`

  function formatLocationLabel(loc?: {
    city: string | null
    area: string | null
    country: string | null
  }): string | undefined {
    if (!loc) return undefined
    const parts = [loc.area, loc.city, loc.country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : undefined
  }

  const pending: DigestShipmentItem[] = params.pending.map((p) => ({
    name: p.name,
    trackingUrl: `${APP_URL}/track/${p.shareCode}`,
    detail: `created ${format(p.createdAt, 'MMM d')}`,
  }))

  const silent: DigestShipmentItem[] = params.silent.map((s) => ({
    name: s.name,
    trackingUrl: `${APP_URL}/track/${s.shareCode}`,
    detail: `last seen ${format(s.lastSeenAt, 'MMM d')}`,
    locationLabel: formatLocationLabel(s.lastLocation),
  }))

  const stuck: DigestShipmentItem[] = params.stuck.map((s) => ({
    name: s.name,
    trackingUrl: `${APP_URL}/track/${s.shareCode}`,
    detail:
      s.stuckSinceHours >= 48
        ? `not moving for ${Math.round(s.stuckSinceHours / 24)}d`
        : `not moving for ${s.stuckSinceHours}h`,
    locationLabel: formatLocationLabel(s.lastLocation),
  }))

  const html = await render(
    ShipmentStatusDigestEmail({
      userName: params.userName,
      dashboardUrl,
      preferencesUrl,
      pending,
      silent,
      stuck,
      unusedLabels:
        params.unusedCount > 0
          ? { count: params.unusedCount, dashboardUrl }
          : undefined,
      cadenceLabel,
    })
  )

  // Subject — deliberately plain. No emoji, no urgency, no shipment name
  // (would feel targeted when we're aggregating multiple). The body carries
  // the detail; the subject is just a calm header.
  const subject =
    params.cadence === 'WEEKLY'
      ? 'This week’s shipment update'
      : 'Today’s shipment update'

  await sendEmail({ to: params.userEmail, subject, html })

  await recordNotification(params.userId, 'shipment_status_digest', {
    cadence: params.cadence,
    pendingCount: params.pending.length,
    silentCount: params.silent.length,
    stuckCount: params.stuck.length,
    unusedCount: params.unusedCount,
    shipmentIds: [
      ...params.pending.map((p) => p.shipmentId),
      ...params.silent.map((s) => s.shipmentId),
      ...params.stuck.map((s) => s.shipmentId),
    ],
  })
}

/**
 * Send shipment stuck notification
 */
export async function sendShipmentStuckNotification(params: {
  userId: string
  orgId?: string | null
  shipmentId?: string
  shipmentName: string
  deviceId: string
  shareCode: string
  lastLocation: LocationForEmail
  stuckSinceHours: number
}): Promise<void> {
  const recipients = await resolveRecipients(params.userId, params.orgId, 'shipment_stuck')
  if (recipients.length === 0) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`

  const html = await render(
    ShipmentStuckEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      stuckSinceHours: params.stuckSinceHours,
      lastLocation: await formatLocation(params.lastLocation),
      trackingUrl,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `⚠️ Shipment Stuck: "${params.shipmentName}" hasn't moved in ${params.stuckSinceHours}h`,
      html,
    })
    await recordNotification(r.userId, 'shipment_stuck', {
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      shipmentId: params.shipmentId ?? params.shareCode,
      lastLocation: params.lastLocation,
      stuckSinceHours: params.stuckSinceHours,
    }, params.orgId)
  }
}

/**
 * Send tracking link to consignee when shipment is created
 */
export async function sendConsigneeTrackingNotification(params: {
  consigneeEmail: string
  shipmentName: string
  senderName: string
  shareCode: string
  originAddress?: string | null
  destinationAddress?: string | null
}): Promise<void> {
  if (!isEmailConfigured()) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const unsubscribeUrl = `${APP_URL}/track/${params.shareCode}/unsubscribe?email=${encodeURIComponent(params.consigneeEmail)}`

  const html = await render(
    ConsigneeTrackingEmail({
      senderName: params.senderName,
      shipmentName: params.shipmentName,
      originAddress: params.originAddress,
      destinationAddress: params.destinationAddress,
      trackingUrl,
      unsubscribeUrl,
    })
  )

  await sendEmail({
    to: params.consigneeEmail,
    subject: `📦 ${params.senderName} shared a shipment tracking link with you`,
    html,
  })
}

/**
 * Send status update email to consignee (in-transit)
 */
export async function sendConsigneeInTransitNotification(params: {
  consigneeEmail: string
  shipmentName: string
  shareCode: string
  originAddress?: string | null
  destinationAddress?: string | null
}): Promise<void> {
  if (!isEmailConfigured()) return

  // Check if consignee has unsubscribed
  const shipment = await db.shipment.findUnique({
    where: { shareCode: params.shareCode },
    select: { consigneeUnsubscribed: true },
  })
  if (shipment?.consigneeUnsubscribed) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const unsubscribeUrl = `${APP_URL}/track/${params.shareCode}/unsubscribe?email=${encodeURIComponent(params.consigneeEmail)}`

  const html = await render(
    ConsigneeInTransitEmail({
      shipmentName: params.shipmentName,
      originAddress: params.originAddress,
      destinationAddress: params.destinationAddress,
      trackingUrl,
      unsubscribeUrl,
    })
  )

  await sendEmail({
    to: params.consigneeEmail,
    subject: `🚛 Your shipment "${params.shipmentName}" is now in transit`,
    html,
  })
}

/**
 * Send delivery notification email to consignee
 */
export async function sendConsigneeDeliveredNotification(params: {
  consigneeEmail: string
  shipmentName: string
  shareCode: string
  destinationAddress?: string | null
  deliveredAt: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  // Check if consignee has unsubscribed
  const shipment = await db.shipment.findUnique({
    where: { shareCode: params.shareCode },
    select: { consigneeUnsubscribed: true },
  })
  if (shipment?.consigneeUnsubscribed) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const unsubscribeUrl = `${APP_URL}/track/${params.shareCode}/unsubscribe?email=${encodeURIComponent(params.consigneeEmail)}`

  const html = await render(
    ConsigneeDeliveredEmail({
      shipmentName: params.shipmentName,
      destinationAddress: params.destinationAddress,
      deliveredAt: params.deliveredAt,
      trackingUrl,
      unsubscribeUrl,
    })
  )

  await sendEmail({
    to: params.consigneeEmail,
    subject: `✅ Delivered: "${params.shipmentName}"`,
    html,
  })
}

/**
 * Send low inventory alert to platform admins.
 * Triggered when an order can't be fully fulfilled from available stock.
 */
export async function sendLowInventoryAlert(params: {
  availableLabels: number
  requestedQuantity: number
  assignedQuantity: number
  orderId: string
  orderUserEmail: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  // Find all platform admins
  const admins = await db.user.findMany({
    where: { role: 'admin' },
    select: { email: true, id: true },
  })

  if (admins.length === 0) {
    console.warn('No admin users found to send low inventory alert')
    return
  }

  const dashboardUrl = `${APP_URL}/admin`

  const html = await render(
    LowInventoryEmail({
      availableLabels: params.availableLabels,
      requestedQuantity: params.requestedQuantity,
      assignedQuantity: params.assignedQuantity,
      orderId: params.orderId,
      orderUserEmail: params.orderUserEmail,
      dashboardUrl,
    })
  )

  const shortfall = params.requestedQuantity - params.assignedQuantity
  const adminEmails = admins.map((a) => a.email).filter(Boolean) as string[]

  if (adminEmails.length === 0) return

  await sendEmail({
    to: adminEmails,
    subject: `🚨 Low Inventory: ${shortfall} label${shortfall !== 1 ? 's' : ''} short — order ${params.orderId.slice(-8).toUpperCase()} needs attention`,
    html,
  })

  // Record for the first admin as audit trail
  await recordNotification(admins[0].id, 'low_inventory', {
    availableLabels: params.availableLabels,
    requestedQuantity: params.requestedQuantity,
    assignedQuantity: params.assignedQuantity,
    orderId: params.orderId,
    orderUserEmail: params.orderUserEmail,
  })
}

/**
 * Send role changed notification to user.
 * Triggered when an admin promotes or demotes a user.
 */
export async function sendRoleChangedNotification(params: {
  userId: string
  newRole: 'admin' | 'user'
  changedByName: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true, firstName: true },
  })

  if (!user?.email) return

  const userName = user.firstName || 'there'
  const dashboardUrl = `${APP_URL}/dashboard`

  const html = await render(
    RoleChangedEmail({
      userName,
      newRole: params.newRole,
      changedByName: params.changedByName,
      dashboardUrl,
    })
  )

  const isPromotion = params.newRole === 'admin'

  await sendEmail({
    to: user.email,
    subject: isPromotion
      ? '🛡️ You now have admin access to TIP'
      : 'Your TIP admin access has been removed',
    html,
  })

  await recordNotification(params.userId, 'role_changed', {
    newRole: params.newRole,
    changedBy: params.changedByName,
  })
}

/**
 * Send notification when a label is physically activated but has no shipment.
 * Notifies the label purchaser with a public claim link.
 */
export async function sendLabelOrphanedNotification(params: {
  labelId: string
  deviceId: string
  claimToken: string
  latitude?: number
  longitude?: number
  geocodedCity?: string | null
  geocodedArea?: string | null
  geocodedCountry?: string | null
}): Promise<void> {
  if (!isEmailConfigured()) return

  // Find the label purchaser via OrderLabel → Order (also grabs orgId)
  const orderLabel = await db.orderLabel.findFirst({
    where: { labelId: params.labelId },
    include: { order: { select: { userId: true, orgId: true } } },
  })

  if (!orderLabel) {
    console.warn('[Notification] No order found for orphaned label:', params.deviceId)
    return
  }

  const userId = orderLabel.order.userId
  const orgId = orderLabel.order.orgId
  const recipients = await resolveRecipients(userId, orgId, 'label_activated')
  if (recipients.length === 0) return

  const claimUrl = `${APP_URL}/claim/${params.claimToken}`
  const detectedAt = format(new Date(), 'PPpp')
  const locationHint =
    params.latitude !== undefined && params.longitude !== undefined
      ? await formatLocation({
          lat: params.latitude,
          lng: params.longitude,
          geocodedCity: params.geocodedCity,
          geocodedArea: params.geocodedArea,
          geocodedCountry: params.geocodedCountry,
        })
      : undefined

  const html = await render(
    LabelOrphanedEmail({
      deviceId: params.deviceId,
      claimUrl,
      detectedAt,
      expiresIn: '48 hours',
      locationHint,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `⚠️ Label ${params.deviceId} activated without a shipment`,
      html,
    })
    await recordNotification(r.userId, 'label_orphaned', {
      deviceId: params.deviceId,
      claimToken: params.claimToken,
    }, orgId)
  }
}

/**
 * Send notification when a shipment is auto-created after the 48h claim window expires.
 */
export async function sendAutoShipmentCreatedNotification(params: {
  userId: string
  orgId?: string | null
  deviceId: string
  shipmentName: string
  shareCode: string
  locationCount: number
}): Promise<void> {
  const recipients = await resolveRecipients(params.userId, params.orgId, 'label_activated')
  if (recipients.length === 0) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const createdAt = format(new Date(), 'PPpp')

  const html = await render(
    AutoShipmentCreatedEmail({
      deviceId: params.deviceId,
      shipmentName: params.shipmentName,
      trackingUrl,
      createdAt,
      locationCount: params.locationCount,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `📦 Shipment auto-created for label ${params.deviceId}`,
      html,
    })
    await recordNotification(r.userId, 'auto_shipment_created', {
      deviceId: params.deviceId,
      shipmentName: params.shipmentName,
    }, params.orgId)
  }
}

/**
 * Receiver-collaboration: send the share link to the receiver's email
 * so they can fill in their delivery details.
 */
export async function sendDispatchDetailsRequested(params: {
  receiverEmail: string
  senderName: string
  shareCode: string
  note?: string | null
}): Promise<void> {
  if (!isEmailConfigured()) return

  const completeUrl = `${APP_URL}/track/${params.shareCode}`

  const html = await render(
    DispatchDetailsRequestedEmail({
      senderName: params.senderName,
      completeUrl,
      note: params.note ?? null,
    })
  )

  await sendEmail({
    to: params.receiverEmail,
    subject: `📦 ${params.senderName} needs your delivery address for TIP labels`,
    html,
  })
}

/**
 * Buyer notification: receiver has submitted their delivery details.
 * This is the main "unauthorized-change detection" signal — always fire.
 */
export async function sendDispatchDetailsSubmitted(params: {
  shipmentId: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  const shipment = await db.shipment.findUnique({
    where: { id: params.shipmentId },
    select: {
      id: true,
      name: true,
      userId: true,
      orgId: true,
      receiverFirstName: true,
      receiverLastName: true,
      consigneeEmail: true,
      destinationAddress: true,
      destinationLine1: true,
      destinationCity: true,
      destinationPostalCode: true,
      destinationCountry: true,
    },
  })
  if (!shipment) return

  // Ride on the order_shipped pref — closest semantic match; this also means
  // buyers who disabled order emails won't get spammed.
  const recipients = await resolveRecipients(shipment.userId, shipment.orgId, 'order_shipped')
  if (recipients.length === 0) return

  const receiverName = [shipment.receiverFirstName, shipment.receiverLastName]
    .filter(Boolean)
    .join(' ') || 'Receiver'
  const address =
    shipment.destinationAddress ||
    [shipment.destinationLine1, shipment.destinationCity, shipment.destinationPostalCode, shipment.destinationCountry]
      .filter(Boolean)
      .join(', ')

  const dispatchUrl = `${APP_URL}/dispatch/${shipment.id}`
  const cancelUrl = `${APP_URL}/dispatch/${shipment.id}?cancel=1`

  const html = await render(
    DispatchDetailsSubmittedEmail({
      dispatchName: shipment.name || 'Label Dispatch',
      receiverName,
      receiverEmail: shipment.consigneeEmail || '',
      destinationAddress: address,
      dispatchUrl,
      cancelUrl,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `✅ Receiver submitted delivery details for ${shipment.name || 'your dispatch'}`,
      html,
    })
    await recordNotification(r.userId, 'dispatch_details_submitted', {
      shipmentId: shipment.id,
      receiverName,
    }, shipment.orgId ?? undefined)
  }
}

/**
 * Sends a confirmation email TO THE RECEIVER after they submit their address
 * via the public share link.
 */
export async function sendDispatchAddressConfirmedToReceiver(params: {
  shipmentId: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  const shipment = await db.shipment.findUnique({
    where: { id: params.shipmentId },
    select: {
      id: true,
      shareCode: true,
      consigneeEmail: true,
      receiverFirstName: true,
      receiverLastName: true,
      destinationAddress: true,
      destinationLine1: true,
      destinationCity: true,
      destinationPostalCode: true,
      destinationCountry: true,
    },
  })
  if (!shipment || !shipment.consigneeEmail) return

  const receiverName = [shipment.receiverFirstName, shipment.receiverLastName]
    .filter(Boolean)
    .join(' ') || 'there'
  const address =
    shipment.destinationAddress ||
    [shipment.destinationLine1, shipment.destinationCity, shipment.destinationPostalCode, shipment.destinationCountry]
      .filter(Boolean)
      .join(', ')

  const trackingUrl = `${APP_URL}/track/${shipment.shareCode}`

  const html = await render(
    DispatchAddressConfirmedEmail({
      receiverName,
      destinationAddress: address,
      trackingUrl,
    })
  )

  await sendEmail({
    to: shipment.consigneeEmail,
    subject: 'We received your address — labels shipping soon',
    html,
  })
}

const SUPPORT_EMAIL = 'support@tip.live'

// Shared fetch for dispatch-owner notifications. Pulls just enough shipment
// fields to render the owner-facing emails, and returns null if the shipment
// is missing (e.g. deleted between PATCH and notification dispatch).
async function loadDispatchForOwnerEmail(shipmentId: string) {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      name: true,
      userId: true,
      orgId: true,
      receiverFirstName: true,
      receiverLastName: true,
      destinationAddress: true,
      destinationLine1: true,
      destinationCity: true,
      destinationPostalCode: true,
      destinationCountry: true,
      shipmentLabels: { select: { labelId: true } },
    },
  })
  if (!shipment) return null

  const receiverName =
    [shipment.receiverFirstName, shipment.receiverLastName].filter(Boolean).join(' ') ||
    'your receiver'
  const address =
    shipment.destinationAddress ||
    [
      shipment.destinationLine1,
      shipment.destinationCity,
      shipment.destinationPostalCode,
      shipment.destinationCountry,
    ]
      .filter(Boolean)
      .join(', ') ||
    'the delivery address'

  return { shipment, receiverName, address }
}

/**
 * Notify the dispatch owner (buyer) that their labels have started shipping
 * to the receiver. Fires when a platform admin marks a LABEL_DISPATCH as
 * IN_TRANSIT (either from PENDING or as a reactivation from DELIVERED).
 *
 * Rides on the `notifyOrderShipped` preference — matches the precedent set
 * by `sendDispatchDetailsSubmitted`.
 */
export async function sendDispatchInTransitNotification(params: {
  shipmentId: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  const loaded = await loadDispatchForOwnerEmail(params.shipmentId)
  if (!loaded) return
  const { shipment, receiverName, address } = loaded

  const recipients = await resolveRecipients(shipment.userId, shipment.orgId, 'order_shipped')
  if (recipients.length === 0) return

  const dispatchUrl = `${APP_URL}/dispatch/${shipment.id}`
  const dispatchName = shipment.name || 'Label Dispatch'

  const html = await render(
    DispatchInTransitEmail({
      dispatchName,
      receiverName,
      destinationAddress: address,
      dispatchUrl,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `🚛 Your TIP labels for "${dispatchName}" are on their way`,
      html,
    })
    await recordNotification(
      r.userId,
      'dispatch_in_transit',
      {
        shipmentId: shipment.id,
        dispatchName,
        receiverName,
      },
      shipment.orgId ?? undefined
    )
  }
}

/**
 * Notify the dispatch owner (buyer) that their labels have been delivered
 * to the receiver. Fires when a platform admin marks a LABEL_DISPATCH as
 * DELIVERED.
 *
 * Uses the `notifyDelivered` preference so it's in line with cargo
 * delivery notifications.
 */
export async function sendDispatchDeliveredNotification(params: {
  shipmentId: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  const loaded = await loadDispatchForOwnerEmail(params.shipmentId)
  if (!loaded) return
  const { shipment, receiverName, address } = loaded

  const recipients = await resolveRecipients(shipment.userId, shipment.orgId, 'shipment_delivered')
  if (recipients.length === 0) return

  const cargoUrl = `${APP_URL}/cargo/new`
  const dispatchName = shipment.name || 'Label Dispatch'
  const deliveredAt = format(new Date(), 'PPpp')

  const html = await render(
    DispatchDeliveredEmail({
      dispatchName,
      receiverName,
      destinationAddress: address,
      deliveredAt,
      cargoUrl,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `✅ Your TIP labels for "${dispatchName}" have arrived`,
      html,
    })
    await recordNotification(
      r.userId,
      'dispatch_delivered',
      {
        shipmentId: shipment.id,
        dispatchName,
        receiverName,
      },
      shipment.orgId ?? undefined
    )
  }
}

/**
 * Notify the dispatch owner (buyer) that their dispatch has been cancelled.
 * Fires on admin-initiated CANCELLED status (via PATCH or DELETE).
 *
 * Rides on the `notifyOrderShipped` preference so buyers who opted out of
 * order-level operational emails also opt out of this one.
 */
export async function sendDispatchCancelledNotification(params: {
  shipmentId: string
}): Promise<void> {
  if (!isEmailConfigured()) return

  const loaded = await loadDispatchForOwnerEmail(params.shipmentId)
  if (!loaded) return
  const { shipment } = loaded

  const recipients = await resolveRecipients(shipment.userId, shipment.orgId, 'order_shipped')
  if (recipients.length === 0) return

  const dispatchListUrl = `${APP_URL}/dispatch`
  const dispatchName = shipment.name || 'Label Dispatch'
  const labelCount = shipment.shipmentLabels.length

  const html = await render(
    DispatchCancelledEmail({
      dispatchName,
      labelCount,
      dispatchListUrl,
      supportEmail: SUPPORT_EMAIL,
    })
  )

  for (const r of recipients) {
    await sendEmail({
      to: r.email,
      subject: `Your dispatch "${dispatchName}" has been cancelled`,
      html,
    })
    await recordNotification(
      r.userId,
      'dispatch_cancelled',
      {
        shipmentId: shipment.id,
        dispatchName,
        labelCount,
      },
      shipment.orgId ?? undefined
    )
  }
}
