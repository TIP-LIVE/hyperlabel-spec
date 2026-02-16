import Stripe from 'stripe'

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY || ''
  // Use placeholder when missing so build/SSR (e.g. no env in CI) doesn't throw at module load
  const keyToUse = key || 'sk_test_build_placeholder'
  _stripe = new Stripe(keyToUse, { typescript: true })
  return _stripe
}

/** Lazy-initialized so build can succeed without STRIPE_SECRET_KEY in env */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string]
  },
})

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || ''
  return Boolean(key && !key.includes('REPLACE_ME'))
}

/**
 * Product configuration for label packs.
 * In production, these would be created in Stripe Dashboard.
 */
export const LABEL_PRODUCTS = {
  starter: {
    name: '1 Tracking Label',
    description: 'Single disposable tracking label with 60+ day battery',
    quantity: 1,
    // Price ID would come from Stripe Dashboard
    priceId: process.env.STRIPE_PRICE_STARTER,
  },
  team: {
    name: '5 Tracking Labels',
    description: 'Pack of 5 disposable tracking labels with 60+ day battery each',
    quantity: 5,
    priceId: process.env.STRIPE_PRICE_TEAM,
  },
  volume: {
    name: '10 Tracking Labels',
    description: 'Pack of 10 disposable tracking labels with 60+ day battery each',
    quantity: 10,
    priceId: process.env.STRIPE_PRICE_VOLUME,
  },
} as const

export type LabelPackType = keyof typeof LABEL_PRODUCTS
