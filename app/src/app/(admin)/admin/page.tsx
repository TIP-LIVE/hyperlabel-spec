import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { Users, Package, ShoppingCart, Radio, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin Overview',
  description: 'HyperLabel admin dashboard overview',
}

export default async function AdminOverviewPage() {
  // Get counts for overview
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
  ])

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      description: 'Registered accounts',
    },
    {
      title: 'Labels in Inventory',
      value: inventoryLabels,
      icon: Package,
      description: `${activeLabels} active, ${depletedLabels} depleted`,
    },
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: ShoppingCart,
      description: `${pendingOrders} pending fulfillment`,
      alert: pendingOrders > 0,
    },
    {
      title: 'Active Shipments',
      value: activeShipments,
      icon: Radio,
      description: 'Currently in transit',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(pendingOrders > 0 || lowBatteryLabels > 0) && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-yellow-200">
            {pendingOrders > 0 && (
              <p>• {pendingOrders} order(s) awaiting fulfillment</p>
            )}
            {lowBatteryLabels > 0 && (
              <p>• {lowBatteryLabels} active label(s) with low battery (&lt;20%)</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-gray-800 bg-gray-800/50">
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
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-800 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">Recent Orders</CardTitle>
            <CardDescription>Latest orders requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentOrders />
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">Low Battery Alerts</CardTitle>
            <CardDescription>Labels with battery below 20%</CardDescription>
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
    include: {
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  if (orders.length === 0) {
    return <p className="text-sm text-gray-500">No pending orders</p>
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">{order.user.email}</p>
            <p className="text-xs text-gray-500">{order.quantity} labels</p>
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
        </div>
      ))}
    </div>
  )
}

async function LowBatteryLabels() {
  const labels = await db.label.findMany({
    where: {
      batteryPct: { lt: 20, gt: 0 },
      status: 'ACTIVE',
    },
    include: {
      shipments: {
        where: { status: 'IN_TRANSIT' },
        take: 1,
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
      {labels.map((label) => (
        <div key={label.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">{label.deviceId}</p>
            <p className="text-xs text-gray-500">
              {label.shipments[0]?.name || 'No active shipment'}
            </p>
          </div>
          <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-500">
            {label.batteryPct}%
          </span>
        </div>
      ))}
    </div>
  )
}
