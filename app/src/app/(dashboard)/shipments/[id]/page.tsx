import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

// Redirect old /shipments/[id] to /cargo/[id] or /dispatch/[id] based on type
export default async function ShipmentDetailRedirectPage({ params }: PageProps) {
  const { id } = await params

  const shipment = await db.shipment.findUnique({
    where: { id },
    select: { type: true },
  })

  if (!shipment) {
    notFound()
  }

  if (shipment.type === 'LABEL_DISPATCH') {
    redirect(`/dispatch/${id}`)
  }

  redirect(`/cargo/${id}`)
}
