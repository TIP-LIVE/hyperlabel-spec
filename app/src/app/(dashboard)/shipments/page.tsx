import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Package, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser, canViewAllOrgData } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { ShipmentsList } from '@/components/shipments/shipments-list'
import { isClerkConfigured } from '@/lib/clerk-config'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Shipments',
  description: 'Track and manage your cargo shipments',
}

interface ShipmentsPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function ShipmentsPage({ searchParams }: ShipmentsPageProps) {
  const { status: initialStatus } = await searchParams
  const user = await getCurrentUser()
  const { orgId, orgRole } = await auth()

  // Build org-scoped query
  const where: Record<string, unknown> = {}
  if (orgId) {
    where.orgId = orgId
    if (!canViewAllOrgData(orgRole || 'org:member')) {
      where.userId = user?.id
    }
  } else if (user) {
    where.userId = user.id
  }

  // Get initial shipment count for empty state check
  let shipmentCount = 0
  if (user) {
    shipmentCount = await db.shipment.count({ where })
  }

  const showEmptyState = shipmentCount === 0 && isClerkConfigured()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Track and manage your cargo shipments"
        action={
          <Button asChild>
            <Link href="/shipments/new">
              <Plus className="mr-2 h-4 w-4" />
              New Shipment
            </Link>
          </Button>
        }
      />

      {/* Shipments List or Empty State */}
      {showEmptyState ? (
        <EmptyState
          icon={Package}
          title="No shipments yet"
          description="To create a shipment you need a tracking label first. Buy labels, receive them, then create a shipment with origin and destination details."
          action={
            <>
              <Button variant="outline" asChild>
                <Link href="/buy">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Buy Labels
                </Link>
              </Button>
              <Button asChild>
                <Link href="/shipments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Shipment
                </Link>
              </Button>
            </>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Shipments</CardTitle>
            <CardDescription>A list of all your cargo shipments</CardDescription>
          </CardHeader>
          <CardContent>
            <ShipmentsList initialStatus={initialStatus} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
