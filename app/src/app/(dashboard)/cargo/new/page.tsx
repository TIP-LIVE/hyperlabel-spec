import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateCargoForm } from '@/components/cargo/create-cargo-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Cargo Shipment',
  description: 'Create a new cargo shipment to track your cargo',
}

export default function NewCargoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Cargo Shipment</h1>
        <p className="text-muted-foreground">
          Attach a tracking label to your cargo and monitor its journey in real time
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cargo Details</CardTitle>
          <CardDescription>
            Configure your cargo shipment details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCargoForm />
        </CardContent>
      </Card>
    </div>
  )
}
