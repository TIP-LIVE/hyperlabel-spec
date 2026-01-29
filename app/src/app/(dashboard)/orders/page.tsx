import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, ShoppingCart } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Orders',
  description: 'View your label orders and purchase history',
}

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const },
  PAID: { label: 'Paid', variant: 'default' as const },
  SHIPPED: { label: 'Shipped', variant: 'default' as const },
  DELIVERED: { label: 'Delivered', variant: 'outline' as const },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' as const },
}

export default async function OrdersPage() {
  const user = await getCurrentUser()

  let orders: Array<{
    id: string
    status: keyof typeof statusConfig
    quantity: number
    totalAmount: number
    currency: string
    createdAt: Date
    shippedAt: Date | null
    trackingNumber: string | null
    _count: { labels: number }
  }> = []

  if (user) {
    orders = await db.order.findMany({
      where: { userId: user.id },
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
          select: { labels: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">View your label orders and purchase history</p>
        </div>
        <Button asChild>
          <Link href="/buy">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Buy Labels
          </Link>
        </Button>
      </div>

      {/* Orders List or Empty State */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold">No orders yet</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Purchase tracking labels to start monitoring your cargo shipments in real-time.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/buy">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buy Labels
              </Link>
            </Button>
          </CardContent>
        </Card>
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
                  <div
                    key={order.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
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
                    <div className="flex flex-wrap items-center gap-3">
                      {order.trackingNumber && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {order.trackingNumber}
                        </span>
                      )}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
