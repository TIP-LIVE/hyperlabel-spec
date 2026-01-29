import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Check } from 'lucide-react'
import { BuyLabelsForm } from '@/components/checkout/buy-labels-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buy Labels',
  description: 'Purchase GPS tracking labels for your shipments',
}

const features = [
  '60+ days battery life',
  'Global cellular coverage (180+ countries)',
  'Real-time GPS tracking',
  'Offline data storage',
  'Shareable tracking links',
  'Delivery notifications',
]

export default function BuyLabelsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Buy Tracking Labels</h1>
        <p className="mt-2 text-muted-foreground">
          Choose your pack size and start tracking your valuable cargo
        </p>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            What&apos;s Included
          </CardTitle>
          <CardDescription>Every label comes with full tracking capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative">
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>Perfect for trying out</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <span className="text-3xl font-bold">1</span>
              <span className="text-muted-foreground"> label</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Full tracking features</li>
              <li>• Shareable link</li>
              <li>• 60+ day battery</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="relative border-2 border-primary">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Best value for regular shippers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <span className="text-3xl font-bold">5</span>
              <span className="text-muted-foreground"> labels</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Everything in Starter</li>
              <li>• Best price per label</li>
              <li>• Priority support</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader>
            <CardTitle>Volume</CardTitle>
            <CardDescription>For frequent shippers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <span className="text-3xl font-bold">10</span>
              <span className="text-muted-foreground"> labels</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Everything in Team</li>
              <li>• Maximum savings</li>
              <li>• Bulk discount</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Form */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Order</CardTitle>
          <CardDescription>
            Select your pack and enter your shipping address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BuyLabelsForm />
        </CardContent>
      </Card>
    </div>
  )
}
