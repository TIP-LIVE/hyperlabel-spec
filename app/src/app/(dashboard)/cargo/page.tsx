import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { CargoList } from '@/components/cargo/cargo-list'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Track Cargo',
  description: 'Track and manage your cargo shipments',
}

interface CargoPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function CargoPage({ searchParams }: CargoPageProps) {
  const { status: initialStatus } = await searchParams

  return (
    <div className="space-y-6">
      <PageHeader
        title="Track Cargo"
        description="Attach tracking labels to your cargo and monitor journeys in real time"
        action={
          <Button asChild>
            <Link href="/cargo/new">
              <Plus className="mr-2 h-4 w-4" />
              New Cargo Shipment
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Cargo Shipments</CardTitle>
          <CardDescription>Track your cargo with real-time location updates</CardDescription>
        </CardHeader>
        <CardContent>
          <CargoList initialStatus={initialStatus} />
        </CardContent>
      </Card>
    </div>
  )
}
