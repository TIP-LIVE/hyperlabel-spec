import { render } from '@react-email/components'
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
import ConsigneeTrackingEmail from '@/emails/consignee-tracking'
import ConsigneeInTransitEmail from '@/emails/consignee-in-transit'
import ConsigneeDeliveredEmail from '@/emails/consignee-delivered'
import { format } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'

// Format coordinates into a human-readable location string
async function formatLocation(lat: number, lng: number): Promise<string> {
  try {
    const geo = await reverseGeocode(lat, lng)
    if (geo) {
      const parts = [geo.area, geo.city, geo.country].filter(Boolean)
      if (parts.length > 0) return parts.join(', ')
    }
  } catch {
    // Fall through to coordinate fallback
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
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

  const prefMap: Record<EmailType, boolean> = {
    label_activated: user.notifyLabelActivated,
    low_battery: user.notifyLowBattery,
    no_signal: user.notifyNoSignal,
    shipment_delivered: user.notifyDelivered,
    order_shipped: user.notifyOrderShipped,
    shipment_stuck: user.notifyShipmentStuck,
    reminders: user.notifyReminders,
  }

  return { enabled: prefMap[emailType], email: user.email }
}

// Record notification in database
async function recordNotification(
  userId: string,
  type: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await db.notification.create({
    data: {
      userId,
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
  shipmentName: string
  deviceId: string
  shareCode: string
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'label_activated')
  if (!enabled || !email) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const activatedAt = format(new Date(), 'PPpp')

  const html = await render(
    LabelActivatedEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      trackingUrl,
      activatedAt,
    })
  )

  await sendEmail({
    to: email,
    subject: `Label Activated: ${params.shipmentName}`,
    html,
  })

  await recordNotification(params.userId, 'label_activated', {
    shipmentName: params.shipmentName,
    deviceId: params.deviceId,
  })
}

/**
 * Send low battery notification
 */
export async function sendLowBatteryNotification(params: {
  userId: string
  shipmentName: string
  deviceId: string
  shareCode: string
  batteryLevel: number
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'low_battery')
  if (!enabled || !email) return

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

  await sendEmail({
    to: email,
    subject,
    html,
  })

  await recordNotification(params.userId, 'low_battery', {
    shipmentName: params.shipmentName,
    batteryLevel: params.batteryLevel,
  })
}

/**
 * Send no signal notification
 */
export async function sendNoSignalNotification(params: {
  userId: string
  shipmentName: string
  deviceId: string
  shareCode: string
  lastSeenAt: Date
  lastLocation?: { lat: number; lng: number }
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'no_signal')
  if (!enabled || !email) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`

  const html = await render(
    NoSignalEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      lastSeenAt: format(params.lastSeenAt, 'PPpp'),
      lastLocation: params.lastLocation
        ? await formatLocation(params.lastLocation.lat, params.lastLocation.lng)
        : undefined,
      trackingUrl,
    })
  )

  await sendEmail({
    to: email,
    subject: `📡 No Signal: ${params.shipmentName}`,
    html,
  })

  await recordNotification(params.userId, 'no_signal', {
    shipmentName: params.shipmentName,
    lastSeenAt: params.lastSeenAt.toISOString(),
  })
}

/**
 * Send shipment delivered notification
 */
export async function sendShipmentDeliveredNotification(params: {
  userId: string
  shipmentName: string
  deviceId: string
  shareCode: string
  destination: string
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'shipment_delivered')
  if (!enabled || !email) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const deliveredAt = format(new Date(), 'PPpp')

  const html = await render(
    ShipmentDeliveredEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      deliveredAt,
      destination: params.destination,
      trackingUrl,
    })
  )

  await sendEmail({
    to: email,
    subject: `✅ Delivered: ${params.shipmentName}`,
    html,
  })

  await recordNotification(params.userId, 'shipment_delivered', {
    shipmentName: params.shipmentName,
    destination: params.destination,
  })
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
    subject = `📋 You have ${params.labelCount} unused tracking label${params.labelCount === 1 ? '' : 's'}`
    const newShipmentUrl = `${APP_URL}/cargo/new`
    html = await render(
      UnusedLabelsReminderEmail({
        userName: name,
        labelCount: params.labelCount || 0,
        deviceIds: params.deviceIds,
        newShipmentUrl,
      })
    )
  } else {
    const trackingUrl = params.shareCode ? `${APP_URL}/track/${params.shareCode}` : `${APP_URL}/dashboard`
    subject = `⏳ Your shipment "${params.shipmentName}" is still pending`
    html = await render(
      PendingShipmentReminderEmail({
        userName: name,
        shipmentName: params.shipmentName || 'Unknown',
        trackingUrl,
      })
    )
  }

  await sendEmail({ to: email, subject, html })

  await recordNotification(params.userId, params.reminderType === 'unused_labels' ? 'unused_label_reminder' : 'pending_shipment_reminder', {
    reminderType: params.reminderType,
    labelCount: params.labelCount,
    shipmentName: params.shipmentName,
    shipmentId: params.shareCode,
  })
}

/**
 * Send shipment stuck notification
 */
export async function sendShipmentStuckNotification(params: {
  userId: string
  shipmentName: string
  deviceId: string
  shareCode: string
  lastLocation: { lat: number; lng: number }
  stuckSinceHours: number
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'shipment_stuck')
  if (!enabled || !email) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`

  const html = await render(
    ShipmentStuckEmail({
      shipmentName: params.shipmentName,
      deviceId: params.deviceId,
      stuckSinceHours: params.stuckSinceHours,
      lastLocation: await formatLocation(params.lastLocation.lat, params.lastLocation.lng),
      trackingUrl,
    })
  )

  await sendEmail({
    to: email,
    subject: `⚠️ Shipment Stuck: "${params.shipmentName}" hasn't moved in ${params.stuckSinceHours}h`,
    html,
  })

  await recordNotification(params.userId, 'shipment_stuck', {
    shipmentName: params.shipmentName,
    deviceId: params.deviceId,
    shipmentId: params.shareCode,
    lastLocation: params.lastLocation,
    stuckSinceHours: params.stuckSinceHours,
  })
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
}): Promise<void> {
  if (!isEmailConfigured()) return

  // Find the label purchaser via OrderLabel → Order
  const orderLabel = await db.orderLabel.findFirst({
    where: { labelId: params.labelId },
    include: { order: { select: { userId: true } } },
  })

  if (!orderLabel) {
    console.warn('[Notification] No order found for orphaned label:', params.deviceId)
    return
  }

  const userId = orderLabel.order.userId
  const { enabled, email } = await shouldSendNotification(userId, 'label_activated')
  if (!enabled || !email) return

  const claimUrl = `${APP_URL}/claim/${params.claimToken}`
  const detectedAt = format(new Date(), 'PPpp')
  const locationHint =
    params.latitude !== undefined && params.longitude !== undefined
      ? await formatLocation(params.latitude, params.longitude)
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

  await sendEmail({
    to: email,
    subject: `⚠️ Label ${params.deviceId} activated without a shipment`,
    html,
  })

  await recordNotification(userId, 'label_orphaned', {
    deviceId: params.deviceId,
    claimToken: params.claimToken,
  })
}

/**
 * Send notification when a shipment is auto-created after the 48h claim window expires.
 */
export async function sendAutoShipmentCreatedNotification(params: {
  userId: string
  deviceId: string
  shipmentName: string
  shareCode: string
  locationCount: number
}): Promise<void> {
  const { enabled, email } = await shouldSendNotification(params.userId, 'label_activated')
  if (!enabled || !email) return

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

  await sendEmail({
    to: email,
    subject: `📦 Shipment auto-created for label ${params.deviceId}`,
    html,
  })

  await recordNotification(params.userId, 'auto_shipment_created', {
    deviceId: params.deviceId,
    shipmentName: params.shipmentName,
  })
}
