import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(stripeSecretKey, {
  typescript: true,
})

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return Boolean(stripeSecretKey && !stripeSecretKey.includes('REPLACE_ME'))
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
