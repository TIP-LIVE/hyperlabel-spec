import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { AddExistingLabelsButton } from '@/components/dashboard/add-existing-labels-dialog'
import { shipmentStatusConfig } from '@/lib/status-config'
import { Package, MapPin, Truck, Battery, ArrowRight, ShoppingCart, QrCode, Radio, CheckCircle } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentUser, canViewAllOrgData } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { formatDistanceToNow } from 'date-fns'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your shipments and tracking labels',
}

const statusConfig = shipmentStatusConfig

export default async function DashboardPage() {
  const user = await getCurrentUser()
  let orgId: string | null = null
  let orgRole: string | null = null
  let needSignIn = false

  try {
    const authResult = await auth()
    orgId = authResult.orgId ?? null
    orgRole = authResult.orgRole ?? null
  } catch {
    needSignIn = true
  }

  if (needSignIn) {
    redirect('/sign-in')
  }

  // Build org-scoped query for shipments
  const where: Record<string, unknown> = {}
  if (orgId) {
    where.orgId = orgId
    if (!canViewAllOrgData(orgRole ?? 'org:member')) {
      where.userId = user?.id
    }
  } else if (user) {
    where.userId = user.id
  }

  // Build org-scoped order filter for label queries
  const orderFilter: Record<string, unknown> = {}
  if (orgId) {
    orderFilter.orgId = orgId
    if (!canViewAllOrgData(orgRole ?? 'org:member')) {
      orderFilter.userId = user?.id
    }
  } else if (user) {
    orderFilter.userId = user.id
  }

  if (process.env.NODE_ENV !== 'test') {
    console.info('[Dashboard] orgId:', orgId ?? 'none', 'orgRole:', orgRole ?? 'none', 'orderFilter:', JSON.stringify(orderFilter))
  }

  // Get current month start for "delivered this month"
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  let activeShipments = 0
  let totalLabels = 0
  let deliveredThisMonth = 0
  let lowBatteryLabels = 0
  let recentShipments: Array<{
    id: string
    name: string | null
    status: keyof typeof statusConfig
    updatedAt: Date
    label?: { deviceId: string; batteryPct: number | null } | null
    locations: Array<{ recordedAt: Date }>
  }> = []

  try {
    const [active, total, delivered, lowBattery, recent] = await Promise.all([
      db.shipment.count({
        where: { ...where, status: 'IN_TRANSIT' },
      }),
      user
        ? db.label.count({
            where: {
              orderLabels: {
                some: {
                  order: {
                    ...orderFilter,
                    status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
                  },
                },
              },
            },
          })
        : 0,
      db.shipment.count({
        where: {
          ...where,
          status: 'DELIVERED',
          deliveredAt: { gte: monthStart },
        },
      }),
      user
        ? db.label.count({
            where: {
              orderLabels: { some: { order: orderFilter } },
              batteryPct: { lt: 20, gt: 0 },
              status: 'ACTIVE',
            },
          })
        : 0,
      db.shipment.findMany({
        where,
        include: {
          label: {
            select: { deviceId: true, batteryPct: true },
          },
          locations: {
            select: { recordedAt: true },
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])
    activeShipments = active
    totalLabels = total
    deliveredThisMonth = delivered
    lowBatteryLabels = lowBattery
    recentShipments = recent
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Dashboard] stats:', { activeShipments: active, totalLabels: total, deliveredThisMonth: delivered, lowBatteryLabels: lowBattery })
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[Dashboard] query error:', err instanceof Error ? err.message : String(err))
    }
    // Database unreachable or query error — render dashboard with empty data
  }

  const stats = [
    {
      name: 'Active Shipments',
      value: activeShipments.toString(),
      icon: Truck,
      description: 'Currently in transit',
      href: '/shipments?status=IN_TRANSIT',
    },
    {
      name: 'Total Labels',
      value: totalLabels.toString(),
      icon: Package,
      description: 'Labels owned',
      href: '/buy',
    },
    {
      name: 'Delivered',
      value: deliveredThisMonth.toString(),
      icon: MapPin,
      description: 'This month',
      href: '/shipments?status=DELIVERED',
    },
    {
      name: 'Low Battery',
      value: lowBatteryLabels.toString(),
      icon: Battery,
      description: lowBatteryLabels > 0 ? 'Needs attention' : 'All good',
      alert: lowBatteryLabels > 0,
      href: '/shipments',
    },
  ]

  /** Short org ID for verification (assign to this org to see labels here) */
  const shortOrgId = orgId && orgId.length > 20 ? '…' + orgId.slice(-12) : orgId ?? ''

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title="Dashboard"
          description="Overview of your shipments and tracking labels"
          action={
          <>
            <AddExistingLabelsButton />
            <Button asChild>
              <Link href="/shipments/new">
                <Package className="mr-2 h-4 w-4" />
                New Shipment
              </Link>
            </Button>
          </>
        }
        />
        {orgId && (
          <p className="mt-1 font-mono text-xs text-muted-foreground" title={orgId}>
            Org ID: {shortOrgId}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <StatCard
              title={stat.name}
              value={stat.value}
              icon={stat.icon}
              description={stat.description}
              alert={stat.alert}
            />
          </Link>
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
            totalLabels > 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto max-w-sm space-y-4">
                  <h3 className="text-lg font-semibold">You have {totalLabels} label{totalLabels === 1 ? '' : 's'} ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a shipment to attach a label and start tracking your cargo in real-time.
                  </p>
                  <Button asChild>
                    <Link href="/shipments/new">
                      <Package className="mr-2 h-4 w-4" />
                      New Shipment
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
            <div className="py-8">
              <div className="mb-6 text-center">
                <h3 className="text-lg font-semibold">Welcome! Here&apos;s how to get started</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Follow these steps to start tracking your cargo in real-time
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1: Buy */}
                <div className="flex items-start gap-4 rounded-lg border p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">1. Buy tracking labels</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Order tracking labels — they&apos;ll arrive at your door within 3-5 business days.
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href="/buy">Buy Labels</Link>
                  </Button>
                </div>

                {/* Step 2: Create Shipment */}
                <div className="flex items-start gap-4 rounded-lg border border-dashed p-4 opacity-60">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">2. Create a shipment</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Scan the QR code or select a label, enter origin & destination, and attach the label to your cargo.
                    </p>
                  </div>
                </div>

                {/* Step 3: Track */}
                <div className="flex items-start gap-4 rounded-lg border border-dashed p-4 opacity-60">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">3. Track in real-time</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Watch your cargo on a live map. Share the tracking link with anyone — no account needed.
                    </p>
                  </div>
                </div>

                {/* Step 4: Delivery */}
                <div className="flex items-start gap-4 rounded-lg border border-dashed p-4 opacity-60">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">4. Confirm delivery</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      The receiver confirms delivery on arrival. You get notified instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )
          ) : (
            <div className="space-y-4">
              {recentShipments.map((shipment) => {
                const status = statusConfig[shipment.status]
                const label = shipment.label
                return (
                  <Link
                    key={shipment.id}
                    href={`/shipments/${shipment.id}`}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">
                          {shipment.name || 'Untitled Shipment'}
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {label?.deviceId ?? '—'} ·{' '}
                          {formatDistanceToNow(
                            new Date(shipment.locations[0]?.recordedAt ?? shipment.updatedAt),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {label != null && label.batteryPct !== null && (
                        <div className="flex items-center gap-1">
                          <Battery
                            className={`h-4 w-4 ${
                              label.batteryPct < 20
                                ? 'text-destructive'
                                : label.batteryPct < 50
                                  ? 'text-yellow-500'
                                  : 'text-green-500'
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              label.batteryPct < 20 ? 'text-destructive font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            {label.batteryPct}%
                          </span>
                        </div>
                      )}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
