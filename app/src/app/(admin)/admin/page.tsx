import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { Users, Package, ShoppingCart, Radio, AlertTriangle, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin Overview',
  description: 'TIP admin dashboard overview',
}

export default async function AdminOverviewPage() {
  const [
    totalUsers,
    ,
    inventoryLabels,
    activeLabels,
    depletedLabels,
    totalOrders,
    pendingOrders,
    activeShipments,
    lowBatteryLabels,
    totalShipments,
  ] = await Promise.all([
    db.user.count(),
    db.label.count(),
    db.label.count({ where: { status: 'INVENTORY' } }),
    db.label.count({ where: { status: 'ACTIVE' } }),
    db.label.count({ where: { status: 'DEPLETED' } }),
    db.order.count(),
    db.order.count({ where: { status: 'PAID' } }),
    db.shipment.count({ where: { status: 'IN_TRANSIT' } }),
    db.label.count({ where: { batteryPct: { lt: 20, gt: 0 }, status: 'ACTIVE' } }),
    db.shipment.count(),
  ])

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      description: 'Registered accounts',
      href: '/admin/users',
    },
    {
      title: 'Labels in Inventory',
      value: inventoryLabels,
      icon: Package,
      description: `${activeLabels} active, ${depletedLabels} depleted`,
      href: '/admin/labels',
    },
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: ShoppingCart,
      description: `${pendingOrders} pending fulfillment`,
      alert: pendingOrders > 0,
      href: '/admin/orders',
    },
    {
      title: 'Active Shipments',
      value: activeShipments,
      icon: Radio,
      description: `${totalShipments} total`,
      href: '/admin/shipments?status=IN_TRANSIT',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Alerts — now clickable */}
      {(pendingOrders > 0 || lowBatteryLabels > 0) && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pendingOrders > 0 && (
              <Link
                href="/admin/orders?status=PAID"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-yellow-200 transition-colors hover:bg-yellow-500/10"
              >
                <span>• {pendingOrders} order(s) awaiting fulfillment</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {lowBatteryLabels > 0 && (
              <Link
                href="/admin/devices"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-yellow-200 transition-colors hover:bg-yellow-500/10"
              >
                <span>• {lowBatteryLabels} active label(s) with low battery (&lt;20%)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid — now clickable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="border-gray-800 bg-gray-800/50 transition-colors hover:border-gray-600 hover:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">{stat.title}</CardTitle>
                <stat.icon
                  className={`h-4 w-4 ${stat.alert ? 'text-yellow-500' : 'text-gray-500'}`}
                />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.alert ? 'text-yellow-500' : 'text-white'}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-800 bg-gray-800/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Recent Orders</CardTitle>
              <CardDescription>Latest orders requiring attention</CardDescription>
            </div>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <RecentOrders />
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-800/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Low Battery Alerts</CardTitle>
              <CardDescription>Labels with battery below 20%</CardDescription>
            </div>
            <Link href="/admin/devices" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <LowBatteryLabels />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function RecentOrders() {
  const orders = await db.order.findMany({
    where: { status: { in: ['PAID', 'SHIPPED'] } },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  if (orders.length === 0) {
    return <p className="text-sm text-gray-500">No pending orders</p>
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/admin/orders/${order.id}`}
          className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-700/50"
        >
          <div>
            <p className="text-sm font-medium text-white">{order.user.email}</p>
            <p className="text-xs text-gray-500">
              {order.quantity} labels · {format(new Date(order.createdAt), 'PP')}
            </p>
          </div>
          <span
            className={`rounded px-2 py-1 text-xs ${
              order.status === 'PAID'
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-blue-500/20 text-blue-500'
            }`}
          >
            {order.status}
          </span>
        </Link>
      ))}
    </div>
  )
}

async function LowBatteryLabels() {
  const labels = await db.label.findMany({
    where: { batteryPct: { lt: 20, gt: 0 }, status: 'ACTIVE' },
    include: {
      shipments: {
        where: { status: 'IN_TRANSIT' },
        take: 1,
        select: { name: true, id: true },
      },
    },
    orderBy: { batteryPct: 'asc' },
    take: 5,
  })

  if (labels.length === 0) {
    return <p className="text-sm text-gray-500">All labels healthy</p>
  }

  return (
    <div className="space-y-3">
      {labels.map((label) => {
        const shipment = label.shipments[0]
        return (
          <div key={label.id} className="flex items-center justify-between rounded-lg px-2 py-1.5">
            <div>
              <p className="text-sm font-medium text-white">{label.deviceId}</p>
              <p className="text-xs text-gray-500">
                {shipment ? (
                  <Link href={`/admin/shipments?q=${label.deviceId}`} className="text-primary hover:underline">
                    {shipment.name || 'Untitled shipment'}
                  </Link>
                ) : (
                  'No active shipment'
                )}
              </p>
            </div>
            <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-500">
              {label.batteryPct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
