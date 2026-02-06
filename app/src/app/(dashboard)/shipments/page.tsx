import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Package, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ShipmentsList } from '@/components/shipments/shipments-list'
import { isClerkConfigured } from '@/lib/clerk-config'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Shipments',
  description: 'Track and manage your cargo shipments',
}

export default async function ShipmentsPage() {
  const user = await getCurrentUser()
  
  // Get initial shipment count for empty state check
  let shipmentCount = 0
  if (user) {
    shipmentCount = await db.shipment.count({
      where: { userId: user.id },
    })
  }

  const showEmptyState = shipmentCount === 0 && isClerkConfigured()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
          <p className="text-muted-foreground">Track and manage your cargo shipments</p>
        </div>
        <Button asChild>
          <Link href="/shipments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Shipment
          </Link>
        </Button>
      </div>

      {/* Shipments List or Empty State */}
      {showEmptyState ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold">No shipments yet</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              To create a shipment you need a tracking label first. Buy labels, receive them, then create a shipment with origin and destination details.
            </p>
            <div className="mt-6 flex gap-3">
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
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Shipments</CardTitle>
            <CardDescription>A list of all your cargo shipments</CardDescription>
          </CardHeader>
          <CardContent>
            <ShipmentsList />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
