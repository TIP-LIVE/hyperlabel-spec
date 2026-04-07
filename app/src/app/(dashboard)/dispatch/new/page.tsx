import { CreateDispatchForm } from '@/components/dispatch/create-dispatch-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Label Dispatch',
  description: 'Tell us where to send your purchased labels',
}

export default function NewDispatchPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Label Dispatch</h1>
        <p className="text-muted-foreground">
          Tell us where to send your purchased labels — your own address, a receiver, or anywhere else
        </p>
      </div>

      <CreateDispatchForm />
    </div>
  )
}
