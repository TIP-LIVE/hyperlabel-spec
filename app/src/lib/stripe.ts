import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
})

/**
 * Product configuration for label packs.
 * In production, these would be created in Stripe Dashboard.
 */
export const LABEL_PRODUCTS = {
  starter: {
    name: 'Starter Pack',
    description: '1 GPS Tracking Label',
    quantity: 1,
    // Price ID would come from Stripe Dashboard
    priceId: process.env.STRIPE_PRICE_STARTER,
  },
  team: {
    name: 'Team Pack',
    description: '5 GPS Tracking Labels',
    quantity: 5,
    priceId: process.env.STRIPE_PRICE_TEAM,
  },
  volume: {
    name: 'Volume Pack',
    description: '10 GPS Tracking Labels',
    quantity: 10,
    priceId: process.env.STRIPE_PRICE_VOLUME,
  },
} as const

export type LabelPackType = keyof typeof LABEL_PRODUCTS
