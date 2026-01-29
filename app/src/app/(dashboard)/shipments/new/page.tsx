import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateShipmentForm } from '@/components/shipments/create-shipment-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Shipment',
  description: 'Create a new shipment to track your cargo',
}

export default function NewShipmentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Shipment</h1>
        <p className="text-muted-foreground">
          Create a new shipment to start tracking your cargo
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
          <CardDescription>
            Enter the destination and select a label to track your cargo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateShipmentForm />
        </CardContent>
      </Card>
    </div>
  )
}
