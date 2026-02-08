import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Check } from 'lucide-react'
import { BuyLabelsForm } from '@/components/checkout/buy-labels-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buy Labels',
  description: 'Purchase tracking labels for your shipments',
}

const features = [
  '60+ days battery life',
  'Global cellular coverage (180+ countries)',
  'Real-time location tracking',
  'Offline data storage',
  'Shareable tracking links',
  'Email notifications',
  'Free shipping included',
]

export default function BuyLabelsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Buy Tracking Labels</h1>
        <p className="mt-2 text-muted-foreground">
          One-time purchase &mdash; choose how many labels you need and we&apos;ll ship them to your address
        </p>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            What&apos;s Included With Every Label
          </CardTitle>
          <CardDescription>
            Each disposable label includes 60 days of tracking, global cellular connectivity, and full platform access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checkout Form with integrated pricing cards */}
      <Card>
        <CardHeader>
          <CardTitle>Order &amp; Checkout</CardTitle>
          <CardDescription>
            Pick quantity, enter shipping address, and proceed to secure payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BuyLabelsForm />
        </CardContent>
      </Card>
    </div>
  )
}
