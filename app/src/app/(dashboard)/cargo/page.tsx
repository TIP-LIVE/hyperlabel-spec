import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Package, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
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
  const { orgId } = await auth()

  const where: Record<string, unknown> = { type: 'CARGO_TRACKING' }
  if (orgId) {
    where.orgId = orgId
  } else if (user) {
    where.userId = user.id
  }

  let shipmentCount = 0
  if (user) {
    shipmentCount = await db.shipment.count({ where })
  }

  const showEmptyState = shipmentCount === 0 && isClerkConfigured()

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
