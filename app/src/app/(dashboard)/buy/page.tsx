import { BuyLabelsForm } from '@/components/checkout/buy-labels-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buy Labels',
  description: 'Purchase tracking labels for your shipments',
}

export default function BuyLabelsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Compact Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buy Tracking Labels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time purchase &mdash; choose how many labels you need
        </p>
      </div>

      <BuyLabelsForm />
    </div>
  )
}
