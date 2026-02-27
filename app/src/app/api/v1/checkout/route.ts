import { NextRequest, NextResponse } from 'next/server'
import { stripe, LABEL_PRODUCTS, LabelPackType, isStripeConfigured } from '@/lib/stripe'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { rateLimit, RATE_LIMIT_CHECKOUT, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const checkoutSchema = z.object({
  packType: z.enum(['starter', 'team', 'volume']),
})

/**
 * POST /api/v1/checkout
 *
 * Creates a Stripe Checkout session for purchasing label packs.
 * Shipping address is NOT collected at checkout — labels are assigned
 * to the user's account and shipped later per-shipment.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP (strict: 10 req/min for checkout)
    const rl = rateLimit(`checkout:${getClientIp(req)}`, RATE_LIMIT_CHECKOUT)
    if (!rl.success) return rateLimitResponse(rl)

    const context = await requireOrgAuth()
    const user = context.user

    const body = await req.json()
    const validated = checkoutSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { packType } = validated.data
    const product = LABEL_PRODUCTS[packType as LabelPackType]

    if (!isStripeConfigured()) {
      console.error('[checkout] Stripe not configured: STRIPE_SECRET_KEY is missing or invalid')
      return NextResponse.json(
        { error: 'Payment system is not available. Please contact support.' },
        { status: 503 }
      )
    }

    if (!product.priceId) {
      console.error(`[checkout] Missing Stripe price ID for pack type: ${packType}. Set STRIPE_PRICE_${packType.toUpperCase()} env var.`)
      return NextResponse.json(
        { error: `The ${product.name} pack is not available for purchase right now. Please contact support.` },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: product.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        orgId: context.orgId,
        packType,
        quantity: product.quantity.toString(),
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid API Key')) {
      console.error('[checkout] Invalid Stripe API key:', error.message)
      return NextResponse.json(
        { error: 'Payment system is temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }
    // Log the full Stripe error for debugging
    if (error instanceof Error) {
      console.error('[checkout] Stripe error:', error.message)
    }
    return handleApiError(error, 'creating checkout session')
  }
}
