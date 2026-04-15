import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, LABEL_PRODUCTS, LabelPackType, isStripeConfigured } from '@/lib/stripe'
import { requireOrgAuth } from '@/lib/auth'
import { rateLimit, RATE_LIMIT_CHECKOUT, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const checkoutSchema = z.object({
  packType: z.enum(['starter', 'team', 'volume']),
})

/** Pin to US East (iad1) — closest to Stripe's API servers, reduces connection timeouts */
export const preferredRegion = 'iad1'

/** Number of application-level retries for Stripe session creation (on top of SDK's own retries) */
const STRIPE_APP_RETRIES = 2

/**
 * POST /api/v1/checkout
 *
 * Creates a Stripe Checkout session for purchasing label packs.
 * Shipping address is NOT collected at checkout — labels are assigned
 * to the user's account and shipped later per-shipment.
 */
export async function POST(req: NextRequest) {
  let step = 'init'
  try {
    // Rate limit by IP (strict: 10 req/min for checkout)
    step = 'rate-limit'
    const rl = rateLimit(`checkout:${getClientIp(req)}`, RATE_LIMIT_CHECKOUT)
    if (!rl.success) return rateLimitResponse(rl)

    step = 'auth'
    const context = await requireOrgAuth()
    const user = context.user

    step = 'parse-body'
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

    step = 'stripe-config-check'
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

    step = 'stripe-create-session'
    // Create Stripe Checkout session with retry on connection errors
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      automatic_payment_methods: { enabled: true },
      ...(user.email ? { customer_email: user.email } : {}),
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
    }

    let session: Stripe.Checkout.Session
    for (let attempt = 1; attempt <= STRIPE_APP_RETRIES; attempt++) {
      try {
        session = await stripe.checkout.sessions.create(sessionParams)
        break
      } catch (retryErr) {
        const isConnection = retryErr instanceof Stripe.errors.StripeConnectionError
        if (isConnection && attempt < STRIPE_APP_RETRIES) {
          console.warn(`[checkout] StripeConnectionError on attempt ${attempt}/${STRIPE_APP_RETRIES}, retrying in ${attempt}s...`)
          await new Promise((r) => setTimeout(r, attempt * 1000))
          continue
        }
        throw retryErr
      }
    }

    return NextResponse.json({
      sessionId: session!.id,
      url: session!.url,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[checkout] Error at step="${step}":`, errorMsg)
    if (error instanceof Error && error.stack) {
      console.error('[checkout] Stack:', error.stack)
    }

    // Handle Stripe-specific errors with useful messages
    if (error instanceof Stripe.errors.StripeError) {
      const stripeErr = error as Stripe.errors.StripeError & { code?: string; statusCode?: number }
      console.error(`[checkout] Stripe error detail: type=${error.type} code=${stripeErr.code ?? 'n/a'} statusCode=${stripeErr.statusCode ?? 'n/a'} message=${error.message}`)

      if (error instanceof Stripe.errors.StripeConnectionError) {
        const keyPrefix = (process.env.STRIPE_SECRET_KEY || '').slice(0, 7)
        console.error(`[checkout] StripeConnectionError — Stripe API unreachable after ${STRIPE_APP_RETRIES} attempts. key_prefix="${keyPrefix}..." sdk_retries=5 timeout=45s region=${process.env.VERCEL_REGION ?? process.env.AWS_REGION ?? 'unknown'}`)
        console.error(`[checkout] Check https://status.stripe.com — if recurring, consider increasing timeout or adding retry`)
        return NextResponse.json(
          { error: 'Could not connect to payment provider. Please try again in a moment.' },
          { status: 502 }
        )
      }

      if (error instanceof Stripe.errors.StripeAuthenticationError) {
        console.error(`[checkout] StripeAuthenticationError — STRIPE_SECRET_KEY may be invalid or expired`)
        return NextResponse.json(
          { error: 'Payment system is temporarily unavailable. Please try again later.' },
          { status: 503 }
        )
      }

      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        return NextResponse.json(
          { error: error.message || 'Invalid payment request. Please try again.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: `Stripe ${error.type}: ${error.message}` },
        { status: 502 }
      )
    }

    // Non-Stripe error — include step and error details to help debug
    const hasType = error && typeof error === 'object' && 'type' in error
    return NextResponse.json(
      { error: `[${step}] ${error instanceof Error ? error.constructor.name : typeof error}: ${errorMsg}${hasType ? ` (type=${(error as Record<string, unknown>).type})` : ''}` },
      { status: 500 }
    )
  }
}
