import { NextRequest, NextResponse } from 'next/server'
import { stripe, LABEL_PRODUCTS, LabelPackType } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const checkoutSchema = z.object({
  packType: z.enum(['starter', 'team', 'volume']),
  // Shipping address for label delivery
  shippingAddress: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().min(1),
    country: z.string().length(2), // ISO 2-letter country code
  }),
})

/**
 * POST /api/v1/checkout
 * 
 * Creates a Stripe Checkout session for purchasing label packs.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validated = checkoutSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { packType, shippingAddress } = validated.data
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
      shipping_address_collection: {
        allowed_countries: ['GB', 'US', 'DE', 'FR', 'NL', 'BE', 'AT', 'CH', 'PL', 'UA'],
      },
      metadata: {
        userId: user.id,
        packType,
        quantity: product.quantity.toString(),
        shippingName: shippingAddress.name,
        shippingLine1: shippingAddress.line1,
        shippingLine2: shippingAddress.line2 || '',
        shippingCity: shippingAddress.city,
        shippingState: shippingAddress.state || '',
        shippingPostalCode: shippingAddress.postalCode,
        shippingCountry: shippingAddress.country,
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    
    if (error instanceof Error && error.message.includes('Invalid API Key')) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
