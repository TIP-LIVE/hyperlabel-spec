import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { sendOrderConfirmedNotification, sendLowInventoryAlert } from '@/lib/notifications'
import Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events for payment processing.
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`Payment succeeded: ${paymentIntent.id}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`Payment failed: ${paymentIntent.id}`)
        // Could send notification to user here
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * Handle successful checkout session.
 * Creates order in database and assigns labels.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const orgId = session.metadata?.orgId || null
  const quantity = parseInt(session.metadata?.quantity || '1', 10)

  if (!userId) {
    console.error('No userId in session metadata')
    return
  }

  // Check if order already exists (idempotency)
  const existingOrder = await db.order.findUnique({
    where: { stripeSessionId: session.id },
  })

  if (existingOrder) {
    console.log(`Order already exists for session ${session.id}`)
    return
  }

  // Get shipping address from session metadata (we store it there during checkout)
  const shippingAddress = {
    name: session.metadata?.shippingName || '',
    line1: session.metadata?.shippingLine1 || '',
    line2: session.metadata?.shippingLine2 || '',
    city: session.metadata?.shippingCity || '',
    state: session.metadata?.shippingState || '',
    postalCode: session.metadata?.shippingPostalCode || '',
    country: session.metadata?.shippingCountry || '',
  }

  // Create the order
  const order = await db.order.create({
    data: {
      userId,
      orgId,
      stripeSessionId: session.id,
      stripePaymentId: session.payment_intent as string,
      status: 'PAID',
      totalAmount: session.amount_total || 0,
      currency: session.currency?.toUpperCase() || 'GBP',
      quantity,
      shippingAddress,
    },
  })

  console.log(`Created order ${order.id} for user ${userId} (${quantity} labels)`)

  // Find available labels in inventory and assign to this order
  const availableLabels = await db.label.findMany({
    where: { status: 'INVENTORY', orderId: null },
    take: quantity,
  })

  if (availableLabels.length < quantity) {
    console.warn(
      `Not enough labels in inventory: need ${quantity}, have ${availableLabels.length}`
    )
    // Order is still created, but labels will need to be assigned manually
    // Send low-inventory alert to platform admins
    sendLowInventoryAlert({
      availableLabels: availableLabels.length,
      requestedQuantity: quantity,
      assignedQuantity: Math.min(availableLabels.length, quantity),
      orderId: order.id,
      orderUserEmail: session.customer_email || userId,
    }).catch((err) => console.error('Failed to send low inventory alert:', err))
  }

  // Assign available labels to the order
  if (availableLabels.length > 0) {
    await db.label.updateMany({
      where: {
        id: { in: availableLabels.map((l) => l.id) },
      },
      data: {
        orderId: order.id,
        status: 'SOLD',
      },
    })

    console.log(`Assigned ${availableLabels.length} labels to order ${order.id}`)
  }

  // Send order confirmation email (fire and forget)
  const totalFormatted = session.currency?.toUpperCase() === 'GBP'
    ? `£${((session.amount_total || 0) / 100).toFixed(2)}`
    : `$${((session.amount_total || 0) / 100).toFixed(2)}`

  const addressParts = [shippingAddress.line1, shippingAddress.line2, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country].filter(Boolean)

  sendOrderConfirmedNotification({
    userId,
    orderNumber: order.id.slice(-8).toUpperCase(),
    quantity,
    totalAmount: totalFormatted,
    shippingName: shippingAddress.name,
    shippingAddress: addressParts.join(', '),
  }).catch((err) => console.error('Failed to send order confirmation:', err))
}
