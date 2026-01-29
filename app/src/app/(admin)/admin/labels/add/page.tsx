import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddLabelsForm } from '@/components/admin/add-labels-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Add Labels',
  description: 'Add new labels to inventory',
}

export default function AddLabelsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Add Labels to Inventory</h1>
        <p className="text-gray-400">Register new GPS tracking labels</p>
      </div>

      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Label Details</CardTitle>
          <CardDescription>Enter the device information for each label</CardDescription>
        </CardHeader>
        <CardContent>
          <AddLabelsForm />
        </CardContent>
      </Card>
    </div>
  )
}
