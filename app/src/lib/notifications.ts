import { render } from '@react-email/components'
import { sendEmail, type EmailType } from './email'
import { db } from './db'
import LabelActivatedEmail from '@/emails/label-activated'
import LowBatteryEmail from '@/emails/low-battery'
import NoSignalEmail from '@/emails/no-signal'
import ShipmentDeliveredEmail from '@/emails/shipment-delivered'
import OrderShippedEmail from '@/emails/order-shipped'
import OrderConfirmedEmail from '@/emails/order-confirmed'
import LowInventoryEmail from '@/emails/low-inventory'
import { format } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'

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

/**
 * Send order confirmed notification (after successful payment)
 */
export async function sendOrderConfirmedNotification(params: {
  userId: string
  orderNumber: string
  quantity: number
  totalAmount: string
  shippingName: string
  shippingAddress: string
}): Promise<void> {
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
      shippingName: params.shippingName,
      shippingAddress: params.shippingAddress,
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
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true, firstName: true },
  })

  if (!user?.email) return

  const name = user.firstName || 'there'
  const newShipmentUrl = `${APP_URL}/shipments/new`

  let subject: string
  let body: string

  if (params.reminderType === 'unused_labels') {
    subject = `📋 You have ${params.labelCount} unused tracking label${params.labelCount === 1 ? '' : 's'}`
    body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; color: #0f172a;">Hi ${name},</h1>
        <p style="font-size: 16px; line-height: 24px; color: #334155;">
          You have <strong>${params.labelCount} tracking label${params.labelCount === 1 ? '' : 's'}</strong>
          that ${params.labelCount === 1 ? "hasn't" : "haven't"} been used yet.
        </p>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin: 0 0 8px;">Labels ready to use</p>
          ${params.deviceIds.map((id) => `<p style="font-size: 14px; color: #0f172a; margin: 4px 0; font-family: monospace;">${id}</p>`).join('')}
        </div>
        <p style="font-size: 16px; line-height: 24px; color: #334155;">
          Create a shipment to start tracking your cargo door-to-door.
        </p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${newShipmentUrl}" style="background-color: #2563eb; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 24px; display: inline-block;">Create a Shipment</a>
        </div>
        <p style="font-size: 14px; color: #64748b;">Powered by <a href="https://tip.live" style="color: #556cd6;">TIP</a></p>
      </div>
    `
  } else {
    const trackingUrl = params.shareCode ? `${APP_URL}/track/${params.shareCode}` : `${APP_URL}/dashboard`
    subject = `⏳ Your shipment "${params.shipmentName}" is still pending`
    body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; color: #0f172a;">Hi ${name},</h1>
        <p style="font-size: 16px; line-height: 24px; color: #334155;">
          Your shipment <strong>"${params.shipmentName}"</strong> was created but hasn't started moving yet.
        </p>
        <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="font-size: 14px; color: #92400e; margin: 0;">
            💡 <strong>Tip:</strong> Peel the backing off your label and stick it on your cargo.
            Once it starts transmitting, the shipment will automatically switch to "In Transit".
          </p>
        </div>
        <p style="font-size: 16px; line-height: 24px; color: #334155;">
          Share this tracking link with the recipient so they can follow the delivery:
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${trackingUrl}" style="background-color: #2563eb; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 24px; display: inline-block;">View Tracking</a>
        </div>
        <p style="font-size: 14px; color: #64748b;">Powered by <a href="https://tip.live" style="color: #556cd6;">TIP</a></p>
      </div>
    `
  }

  await sendEmail({ to: user.email, subject, html: body })

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
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true, firstName: true },
  })

  if (!user?.email) return

  const trackingUrl = `${APP_URL}/track/${params.shareCode}`
  const name = user.firstName || 'there'

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; color: #0f172a;">Hi ${name},</h1>
      <p style="font-size: 16px; line-height: 24px; color: #334155;">
        Your shipment <strong>"${params.shipmentName}"</strong> appears to be stuck —
        the tracking label hasn't moved significantly in the last <strong>${params.stuckSinceHours} hours</strong>.
      </p>
      <div style="background-color: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="font-size: 12px; font-weight: 600; color: #991b1b; text-transform: uppercase; margin: 0 0 4px;">Last known position</p>
        <p style="font-size: 14px; color: #0f172a; margin: 0;">
          ${params.lastLocation.lat.toFixed(4)}, ${params.lastLocation.lng.toFixed(4)}
        </p>
        <p style="font-size: 12px; font-weight: 600; color: #991b1b; text-transform: uppercase; margin: 12px 0 4px;">Device</p>
        <p style="font-size: 14px; color: #0f172a; margin: 0; font-family: monospace;">
          ${params.deviceId}
        </p>
      </div>
      <p style="font-size: 16px; line-height: 24px; color: #334155;">
        This could mean:
      </p>
      <ul style="font-size: 14px; line-height: 24px; color: #334155; padding-left: 20px;">
        <li>The cargo is waiting at a warehouse or port</li>
        <li>The shipment is delayed or held by customs</li>
        <li>There may be an issue with delivery</li>
      </ul>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${trackingUrl}" style="background-color: #2563eb; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 24px; display: inline-block;">View Tracking</a>
      </div>
      <p style="font-size: 14px; color: #64748b;">Powered by <a href="https://tip.live" style="color: #556cd6;">TIP</a></p>
    </div>
  `

  await sendEmail({
    to: user.email,
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
  const trackingUrl = `${APP_URL}/track/${params.shareCode}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 24px 0;">
        <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin: 0 0 8px;">📦 Shipment on its way!</h1>
        <p style="color: #64748b; margin: 0;">${params.senderName} is tracking a shipment for you</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin: 0 0 4px;">Shipment</p>
        <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px;">${params.shipmentName}</p>
        ${params.originAddress ? `
        <p style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin: 0 0 4px;">From</p>
        <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px;">${params.originAddress}</p>
        ` : ''}
        ${params.destinationAddress ? `
        <p style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin: 0 0 4px;">To</p>
        <p style="font-size: 16px; color: #0f172a; margin: 0;">${params.destinationAddress}</p>
        ` : ''}
      </div>

      <p style="font-size: 16px; line-height: 24px; color: #334155;">
        You can track this shipment in real-time using the link below. When it arrives, click <strong>"Confirm Delivery"</strong> to notify the sender and deactivate tracking.
      </p>

      <div style="margin: 32px 0; text-align: center;">
        <a href="${trackingUrl}" style="background-color: #2563eb; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 24px; display: inline-block;">Track My Shipment</a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          You received this email because ${params.senderName} shared a tracking link with you via
          <a href="https://tip.live" style="color: #556cd6;">TIP</a> — door-to-door cargo tracking.
        </p>
      </div>
    </div>
  `

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
  const trackingUrl = `${APP_URL}/track/${params.shareCode}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 24px 0;">
        <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin: 0 0 8px;">🚛 Your shipment is moving!</h1>
        <p style="color: #64748b; margin: 0;">The tracking label is now transmitting — your shipment is in transit</p>
      </div>

      <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="font-size: 12px; font-weight: 600; color: #3b82f6; text-transform: uppercase; margin: 0 0 4px;">Shipment</p>
        <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px; font-weight: 600;">${params.shipmentName}</p>
        ${params.originAddress && params.destinationAddress ? `
        <p style="font-size: 14px; color: #334155; margin: 0;">
          ${params.originAddress} → ${params.destinationAddress}
        </p>
        ` : params.destinationAddress ? `
        <p style="font-size: 14px; color: #334155; margin: 0;">
          Heading to: ${params.destinationAddress}
        </p>
        ` : ''}
      </div>

      <p style="font-size: 16px; line-height: 24px; color: #334155;">
        Follow the shipment in real-time on the tracking page. You'll receive another email when it arrives near the destination.
      </p>

      <div style="margin: 32px 0; text-align: center;">
        <a href="${trackingUrl}" style="background-color: #2563eb; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 24px; display: inline-block;">Track Live</a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Powered by <a href="https://tip.live" style="color: #556cd6;">TIP</a> — door-to-door cargo tracking.
        </p>
      </div>
    </div>
  `

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
  const trackingUrl = `${APP_URL}/track/${params.shareCode}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 24px 0;">
        <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin: 0 0 8px;">✅ Shipment Delivered!</h1>
        <p style="color: #64748b; margin: 0;">Your shipment has been marked as delivered</p>
      </div>

      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="font-size: 12px; font-weight: 600; color: #16a34a; text-transform: uppercase; margin: 0 0 4px;">Shipment</p>
        <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px; font-weight: 600;">${params.shipmentName}</p>
        ${params.destinationAddress ? `
        <p style="font-size: 12px; font-weight: 600; color: #16a34a; text-transform: uppercase; margin: 0 0 4px;">Delivered to</p>
        <p style="font-size: 14px; color: #334155; margin: 0 0 16px;">${params.destinationAddress}</p>
        ` : ''}
        <p style="font-size: 12px; font-weight: 600; color: #16a34a; text-transform: uppercase; margin: 0 0 4px;">Delivered at</p>
        <p style="font-size: 14px; color: #334155; margin: 0;">${params.deliveredAt}</p>
      </div>

      <p style="font-size: 16px; line-height: 24px; color: #334155;">
        Tracking has been deactivated. You can still view the complete journey history for the next 90 days.
      </p>

      <div style="margin: 32px 0; text-align: center;">
        <a href="${trackingUrl}" style="background-color: #16a34a; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 24px; display: inline-block;">View Journey</a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Powered by <a href="https://tip.live" style="color: #556cd6;">TIP</a> — door-to-door cargo tracking.
        </p>
      </div>
    </div>
  `

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
  // Find all platform admins
  const admins = await db.user.findMany({
    where: { role: 'admin' },
    select: { email: true },
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
}
