import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Package, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { CargoList } from '@/components/cargo/cargo-list'
import { isClerkConfigured } from '@/lib/clerk-config'
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
  const user = await getCurrentUser()

  // Check if the user has ANY cargo shipments (across all orgs)
  // to decide whether to show the onboarding empty state vs the list.
  // The CargoList client component handles org-scoped filtering via the API.
  let hasAnyCargo = false
  if (user) {
    const count = await db.shipment.count({
      where: {
        type: 'CARGO_TRACKING',
        userId: user.id,
      },
    })
    hasAnyCargo = count > 0
  }

  const showEmptyState = !hasAnyCargo && isClerkConfigured()

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

      {showEmptyState ? (
        <EmptyState
          icon={Package}
          title="No cargo shipments yet"
          description="To track cargo you need a tracking label first. Buy labels, receive them, then create a cargo shipment with origin and destination details."
          action={
            <>
              <Button variant="outline" asChild>
                <Link href="/buy">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy Labels
                </Link>
              </Button>
              <Button asChild>
                <Link href="/cargo/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Cargo Shipment
                </Link>
              </Button>
            </>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cargo Shipments</CardTitle>
            <CardDescription>Track your cargo with real-time location updates</CardDescription>
          </CardHeader>
          <CardContent>
            <CargoList initialStatus={initialStatus} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
