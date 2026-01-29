import { render } from '@react-email/components'
import { sendEmail, type EmailType } from './email'
import { db } from './db'
import LabelActivatedEmail from '@/emails/label-activated'
import LowBatteryEmail from '@/emails/low-battery'
import NoSignalEmail from '@/emails/no-signal'
import ShipmentDeliveredEmail from '@/emails/shipment-delivered'
import OrderShippedEmail from '@/emails/order-shipped'
import { format } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hyperlabel.io'

// Check if user has enabled a specific notification type
async function shouldSendNotification(
  userId: string,
  emailType: EmailType
): Promise<{ enabled: boolean; email: string | null }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      notifyLabelActivated: true,
      notifyLowBattery: true,
      notifyNoSignal: true,
      notifyDelivered: true,
      notifyOrderShipped: true,
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

  const trackingUrl = `${APP_URL}/shipments/${params.shareCode}`
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
        ? `${params.lastLocation.lat.toFixed(4)}, ${params.lastLocation.lng.toFixed(4)}`
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
