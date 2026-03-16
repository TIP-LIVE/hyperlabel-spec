import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddLabelsForm } from '@/components/admin/add-labels-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Add Labels',
  description: 'Add new labels to inventory',
}

export default function AddLabelsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Add Labels to Inventory</h1>
        <p className="text-muted-foreground">Register new tracking labels</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Label Details</CardTitle>
          <CardDescription>Enter the device information for each label</CardDescription>
        </CardHeader>
        <CardContent>
          <AddLabelsForm />
        </CardContent>
      </Card>
    </div>
  )
}
