import { CreateDispatchForm } from '@/components/dispatch/create-dispatch-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Label Dispatch',
  description: 'Ship labels from your warehouse to a customer location',
}

export default function NewDispatchPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Label Dispatch</h1>
        <p className="text-muted-foreground">
          Ship multiple labels from your warehouse to a customer location
        </p>
      </div>

      <CreateDispatchForm />
    </div>
  )
}
