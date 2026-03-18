/**
 * Script to send all 16 email templates to a test address for review.
 * Usage: npx tsx scripts/send-test-emails.ts
 */
import { render } from '@react-email/components'
import { Resend } from 'resend'
import { config } from 'dotenv'

// Load env
config({ path: '.env' })

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL || 'TIP <notifications@tip.live>'
const TO = 'denys@tip.live'

// Import all templates
import OrderConfirmedEmail from '../src/emails/order-confirmed'
import OrderShippedEmail from '../src/emails/order-shipped'
import LabelActivatedEmail from '../src/emails/label-activated'
import LabelOrphanedEmail from '../src/emails/label-orphaned'
import AutoShipmentCreatedEmail from '../src/emails/auto-shipment-created'
import LowBatteryEmail from '../src/emails/low-battery'
import NoSignalEmail from '../src/emails/no-signal'
import ShipmentStuckEmail from '../src/emails/shipment-stuck'
import ShipmentDeliveredEmail from '../src/emails/shipment-delivered'
import UnusedLabelsReminderEmail from '../src/emails/unused-labels-reminder'
import PendingShipmentReminderEmail from '../src/emails/pending-shipment-reminder'
import ConsigneeTrackingEmail from '../src/emails/consignee-tracking'
import ConsigneeInTransitEmail from '../src/emails/consignee-in-transit'
import ConsigneeDeliveredEmail from '../src/emails/consignee-delivered'
import LowInventoryEmail from '../src/emails/low-inventory'
import RoleChangedEmail from '../src/emails/role-changed'

interface EmailDef {
  name: string
  subject: string
  component: React.ReactElement
}

const emails: EmailDef[] = [
  {
    name: '1/16 — Order Confirmed',
    subject: '✅ Order Confirmed — 3 Tracking Labels',
    component: OrderConfirmedEmail({
      orderNumber: 'ORD-2026-0042',
      quantity: 3,
      totalAmount: '€149.00',
      dashboardUrl: 'https://tip.live/dashboard',
    }),
  },
  {
    name: '2/16 — Order Shipped',
    subject: '📦 Order #ORD-2026-0042 Has Shipped!',
    component: OrderShippedEmail({
      orderNumber: 'ORD-2026-0042',
      quantity: 3,
      trackingNumber: 'DHL1234567890',
      trackingUrl: 'https://track.aftership.com/DHL1234567890',
      dashboardUrl: 'https://tip.live/dashboard',
    }),
  },
  {
    name: '3/16 — Label Activated',
    subject: 'Label Activated: Coffee Beans → Rotterdam',
    component: LabelActivatedEmail({
      shipmentName: 'Coffee Beans → Rotterdam',
      deviceId: 'TIP-042',
      trackingUrl: 'https://tip.live/track/abc123',
      activatedAt: 'Mar 12, 2026, 2:30 PM',
    }),
  },
  {
    name: '4/16 — Label Orphaned',
    subject: '⚠️ Label TIP-042 activated without a shipment',
    component: LabelOrphanedEmail({
      deviceId: 'TIP-042',
      claimUrl: 'https://tip.live/claim/tok_abc123',
      detectedAt: 'Mar 12, 2026, 2:30 PM',
      expiresIn: '24 hours',
      locationHint: '51.9225, 4.4792',
    }),
  },
  {
    name: '5/16 — Auto-Shipment Created',
    subject: '📦 Shipment auto-created for label TIP-042',
    component: AutoShipmentCreatedEmail({
      deviceId: 'TIP-042',
      shipmentName: 'Shipment – TIP-042',
      trackingUrl: 'https://tip.live/track/abc123',
      createdAt: 'Mar 12, 2026, 2:30 PM',
      locationCount: 47,
    }),
  },
  {
    name: '6/16 — Low Battery (Warning)',
    subject: '🔋 Low Battery: Coffee Beans → Rotterdam',
    component: LowBatteryEmail({
      shipmentName: 'Coffee Beans → Rotterdam',
      deviceId: 'TIP-042',
      batteryLevel: 18,
      trackingUrl: 'https://tip.live/track/abc123',
      estimatedDaysRemaining: 5,
    }),
  },
  {
    name: '7/16 — Low Battery (Critical)',
    subject: '⚠️ Critical Battery: Coffee Beans → Rotterdam',
    component: LowBatteryEmail({
      shipmentName: 'Coffee Beans → Rotterdam',
      deviceId: 'TIP-042',
      batteryLevel: 8,
      trackingUrl: 'https://tip.live/track/abc123',
      estimatedDaysRemaining: 1,
    }),
  },
  {
    name: '8/16 — No Signal',
    subject: '📡 No Signal: Coffee Beans → Rotterdam',
    component: NoSignalEmail({
      shipmentName: 'Coffee Beans → Rotterdam',
      deviceId: 'TIP-042',
      lastSeenAt: 'Mar 11, 2026, 10:15 AM',
      lastLocation: '51.9225, 4.4792',
      trackingUrl: 'https://tip.live/track/abc123',
    }),
  },
  {
    name: '9/16 — Shipment Stuck',
    subject: '⚠️ Shipment Stuck: "Coffee Beans → Rotterdam" hasn\'t moved in 36h',
    component: ShipmentStuckEmail({
      shipmentName: 'Coffee Beans → Rotterdam',
      deviceId: 'TIP-042',
      stuckSinceHours: 36,
      lastLocation: '51.9225, 4.4792',
      trackingUrl: 'https://tip.live/track/abc123',
    }),
  },
  {
    name: '10/16 — Shipment Delivered',
    subject: '✅ Delivered: Coffee Beans → Rotterdam',
    component: ShipmentDeliveredEmail({
      shipmentName: 'Coffee Beans → Rotterdam',
      deviceId: 'TIP-042',
      deliveredAt: 'Mar 12, 2026, 2:30 PM',
      destination: 'Wilhelminakade 1, Rotterdam, Netherlands',
      trackingUrl: 'https://tip.live/track/abc123',
    }),
  },
  {
    name: '11/16 — Unused Labels Reminder',
    subject: '📋 You have 3 unused tracking labels',
    component: UnusedLabelsReminderEmail({
      userName: 'Denys',
      labelCount: 3,
      deviceIds: ['TIP-040', 'TIP-041', 'TIP-042'],
      newShipmentUrl: 'https://tip.live/shipments/new',
    }),
  },
  {
    name: '12/16 — Pending Shipment Reminder',
    subject: '⏳ Your shipment "Coffee Beans → Rotterdam" is still pending',
    component: PendingShipmentReminderEmail({
      userName: 'Denys',
      shipmentName: 'Coffee Beans → Rotterdam',
      trackingUrl: 'https://tip.live/track/abc123',
    }),
  },
  {
    name: '13/16 — Consignee Tracking Link',
    subject: '📦 Denys Chumak shared a shipment tracking link with you',
    component: ConsigneeTrackingEmail({
      senderName: 'Denys Chumak',
      shipmentName: 'Coffee Beans → Rotterdam',
      originAddress: 'Bogotá, Colombia',
      destinationAddress: 'Rotterdam, Netherlands',
      trackingUrl: 'https://tip.live/track/abc123',
      unsubscribeUrl: 'https://tip.live/track/abc123/unsubscribe?email=recipient@example.com',
    }),
  },
  {
    name: '14/16 — Consignee In-Transit',
    subject: '🚛 Your shipment "Coffee Beans → Rotterdam" is now in transit',
    component: ConsigneeInTransitEmail({
      shipmentName: 'Coffee Beans → Rotterdam',
      originAddress: 'Bogotá, Colombia',
      destinationAddress: 'Rotterdam, Netherlands',
      trackingUrl: 'https://tip.live/track/abc123',
      unsubscribeUrl: 'https://tip.live/track/abc123/unsubscribe?email=recipient@example.com',
    }),
  },
  {
    name: '15/16 — Consignee Delivered',
    subject: '✅ Delivered: "Coffee Beans → Rotterdam"',
    component: ConsigneeDeliveredEmail({
      shipmentName: 'Coffee Beans → Rotterdam',
      destinationAddress: 'Wilhelminakade 1, Rotterdam, Netherlands',
      deliveredAt: 'Mar 12, 2026, 2:30 PM',
      trackingUrl: 'https://tip.live/track/abc123',
      unsubscribeUrl: 'https://tip.live/track/abc123/unsubscribe?email=recipient@example.com',
    }),
  },
  {
    name: '16/16 — Low Inventory Alert (Admin)',
    subject: '🚨 Low Inventory: 2 labels short — order A1B2C3D4 needs attention',
    component: LowInventoryEmail({
      availableLabels: 3,
      requestedQuantity: 5,
      assignedQuantity: 3,
      orderId: 'clxyz1234567890a1b2c3d4',
      orderUserEmail: 'customer@example.com',
      dashboardUrl: 'https://tip.live/admin',
    }),
  },
]

// We skip Role Changed (admin promotion) as a bonus — 16 already includes it conceptually
// Actually, let's add it:
emails.push({
  name: '17/17 — Role Changed (Admin Promotion)',
  subject: '🛡️ You now have admin access to TIP',
  component: RoleChangedEmail({
    userName: 'Denys',
    newRole: 'admin',
    changedByName: 'System Admin',
    dashboardUrl: 'https://tip.live/dashboard',
  }),
})

// Update naming
emails.forEach((e, i) => {
  e.name = `${i + 1}/${emails.length} — ${e.name.split(' — ')[1]}`
})

async function sendAll() {
  console.log(`Sending ${emails.length} test emails to ${TO}...\n`)

  for (const email of emails) {
    try {
      const html = await render(email.component)
      const { error } = await resend.emails.send({
        from: FROM,
        to: [TO],
        subject: `[TEST] ${email.subject}`,
        html,
      })

      if (error) {
        console.error(`❌ ${email.name}: ${error.message}`)
      } else {
        console.log(`✅ ${email.name}`)
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      console.error(`❌ ${email.name}: ${err}`)
    }
  }

  console.log('\nDone!')
}

sendAll()
