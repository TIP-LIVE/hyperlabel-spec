import { ensureDefaultPacks } from '@/lib/pricing'
import { db } from '@/lib/db'
import { PricingForm } from '@/components/admin/pricing-form'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Label Pricing',
  description: 'Edit label pack pricing',
}

export default async function AdminPricingPage() {
  await ensureDefaultPacks()
  const packs = await db.labelPack.findMany({ orderBy: { quantity: 'asc' } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Label Pricing</h1>
        <p className="mt-1 text-muted-foreground">
          Edit the price of each label pack. Changes take effect immediately on the
          &ldquo;Buy Labels&rdquo; page and at Stripe checkout &mdash; no deploy needed.
        </p>
      </div>

      <PricingForm
        initialPacks={packs.map((p) => ({
          key: p.key,
          name: p.name,
          description: p.description,
          quantity: p.quantity,
          priceCents: p.priceCents,
          popular: p.popular,
        }))}
      />
    </div>
  )
}
