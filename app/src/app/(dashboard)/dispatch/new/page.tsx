import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateDispatchForm } from '@/components/dispatch/create-dispatch-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Label Dispatch',
  description: 'Ship labels from your warehouse to a customer location',
}

export default function NewDispatchPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Label Dispatch</h1>
        <p className="text-muted-foreground">
          Ship multiple labels from your warehouse to a customer location
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch Details</CardTitle>
          <CardDescription>
            Configure your label dispatch details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateDispatchForm />
        </CardContent>
      </Card>
    </div>
  )
}
