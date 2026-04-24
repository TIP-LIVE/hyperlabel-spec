import Stripe from 'stripe'

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY || ''
  // Use placeholder when missing so build/SSR (e.g. no env in CI) doesn't throw at module load
  const keyToUse = key || 'sk_test_build_placeholder'
  const isReal = key && !key.includes('placeholder')
  console.log(`[stripe] Initializing Stripe client: key_prefix="${keyToUse.slice(0, 7)}..." is_live=${keyToUse.startsWith('sk_live')} is_configured=${isReal} region=${process.env.VERCEL_REGION ?? 'local'}`)
  _stripe = new Stripe(keyToUse, {
    typescript: true,
    maxNetworkRetries: 5,
    timeout: 45_000,
  })
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

export type LabelPackType = 'starter' | 'team' | 'volume'
