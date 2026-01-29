import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, MapPin, Truck, Battery, ArrowRight } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { formatDistanceToNow } from 'date-fns'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your shipments and tracking labels',
}

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' as const },
  DELIVERED: { label: 'Delivered', variant: 'outline' as const },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' as const },
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const userId = user?.id

  // Get current month start for "delivered this month"
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Fetch stats and recent shipments in parallel
  const [activeShipments, totalLabels, deliveredThisMonth, lowBatteryLabels, recentShipments] =
    await Promise.all([
      // Active shipments
      db.shipment.count({
        where: {
          ...(userId && { userId }),
          status: 'IN_TRANSIT',
        },
      }),

      // Total labels owned
      userId
        ? db.label.count({
            where: {
              order: {
                userId,
                status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
              },
            },
          })
        : 0,

      // Delivered this month
      db.shipment.count({
        where: {
          ...(userId && { userId }),
          status: 'DELIVERED',
          deliveredAt: { gte: monthStart },
        },
      }),

      // Low battery labels
      userId
        ? db.label.count({
            where: {
              order: { userId },
              batteryPct: { lt: 20, gt: 0 },
              status: 'ACTIVE',
            },
          })
        : 0,

      // Recent shipments
      db.shipment.findMany({
        where: userId ? { userId } : {},
        include: {
          label: {
            select: {
              deviceId: true,
              batteryPct: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

  const stats = [
    {
      name: 'Active Shipments',
      value: activeShipments.toString(),
      icon: Truck,
      description: 'Currently in transit',
    },
    {
      name: 'Total Labels',
      value: totalLabels.toString(),
      icon: Package,
      description: 'Labels owned',
    },
    {
      name: 'Delivered',
      value: deliveredThisMonth.toString(),
      icon: MapPin,
      description: 'This month',
    },
    {
      name: 'Low Battery',
      value: lowBatteryLabels.toString(),
      icon: Battery,
      description: lowBatteryLabels > 0 ? 'Needs attention' : 'All good',
      alert: lowBatteryLabels > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your shipments and tracking labels</p>
        </div>
        <Button asChild>
          <Link href="/shipments/new">
            <Package className="mr-2 h-4 w-4" />
            New Shipment
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon
                className={`h-4 w-4 ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`}
              />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.alert ? 'text-destructive' : ''}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Shipments</CardTitle>
            <CardDescription>Your most recent cargo shipments</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/shipments">
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No shipments yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Purchase your first tracking label to start monitoring your cargo in real-time.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/buy">Buy Labels</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentShipments.map((shipment) => {
                const status = statusConfig[shipment.status]
                return (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Link
                          href={`/shipments/${shipment.id}`}
                          className="font-medium hover:underline"
                        >
                          {shipment.name || 'Untitled Shipment'}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {shipment.label.deviceId} ·{' '}
                          {formatDistanceToNow(new Date(shipment.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {shipment.label.batteryPct !== null && (
                        <span
                          className={`text-sm ${
                            shipment.label.batteryPct < 20 ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          {shipment.label.batteryPct}%
                        </span>
                      )}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
