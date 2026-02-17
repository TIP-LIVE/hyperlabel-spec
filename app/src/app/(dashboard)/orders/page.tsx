import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { orderStatusConfig } from '@/lib/status-config'
import { Package, ShoppingCart, Truck } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { format } from 'date-fns'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Orders',
  description: 'View your label orders and purchase history',
}

const statusConfig = orderStatusConfig

export default async function OrdersPage() {
  const user = await getCurrentUser()
  const { orgId, orgRole } = await auth()

  let orders: Array<{
    id: string
    status: keyof typeof statusConfig
    quantity: number
    totalAmount: number
    currency: string
    createdAt: Date
    shippedAt: Date | null
    trackingNumber: string | null
    _count: { orderLabels: number }
  }> = []

  if (user) {
    // B2B: org is top-level — all org members see same orders
    const where: Record<string, unknown> = {}
    if (orgId) {
      where.orgId = orgId
    } else {
      where.userId = user.id
    }

    orders = await db.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        quantity: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
        shippedAt: true,
        trackingNumber: true,
        _count: {
          select: { orderLabels: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="View your label orders and purchase history"
        action={
          <Button asChild>
            <Link href="/buy">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Buy Labels
            </Link>
          </Button>
        }
      />

      {/* Orders List or Empty State */}
      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Tracking labels start at $25 each. Order a pack and they'll appear in your dashboard instantly."
          action={
            <Button asChild>
              <Link href="/buy">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buy Your First Labels
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>All your label purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order) => {
                const status = statusConfig[order.status]
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {order.quantity} Label{order.quantity > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.createdAt), 'PPP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {order.trackingNumber && (
                        <a
                          href={`https://track.aftership.com/${order.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Truck className="h-3 w-3" />
                          <span className="font-mono">{order.trackingNumber}</span>
                        </a>
                      )}
                      {order.shippedAt && !order.trackingNumber && (
                        <p className="text-xs text-muted-foreground">
                          Shipped {format(new Date(order.shippedAt), 'PP')}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
