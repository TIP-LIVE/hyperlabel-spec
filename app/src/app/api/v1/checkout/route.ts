import { NextRequest, NextResponse } from 'next/server'
import { stripe, LABEL_PRODUCTS, LabelPackType } from '@/lib/stripe'
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

    if (!product.priceId) {
      // Fallback: Create a price on the fly if no price ID configured
      // In production, prices should be pre-created in Stripe Dashboard
      return NextResponse.json(
        { error: 'Product not configured', details: 'Stripe price ID not set for this product' },
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
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      )
    }
    return handleApiError(error, 'creating checkout session')
  }
}
