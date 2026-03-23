import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { AddExistingLabelsButton } from '@/components/dashboard/add-existing-labels-dialog'
import { DashboardMap } from '@/components/dashboard/dashboard-map'
import { shipmentStatusConfig } from '@/lib/status-config'
import { formatLocationName, getLastUpdateDate, getLocationCountryCode } from '@/lib/utils/location-display'
import { countryCodeToFlag } from '@/lib/utils/country-flag'
import { Package, MapPin, Truck, Battery, ArrowRight, ShoppingCart, QrCode, Radio, CheckCircle, AlertCircle, Send, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/backend'
import { timeAgo } from '@/lib/utils/time-ago'
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

  // B2B: org is top-level — all org members see same shipments and labels
  // Use OR to match both org-level and user-level records (some data predates org setup)
  const where: Record<string, unknown> = {
    OR: [
      ...(orgId ? [{ orgId }] : []),
      ...(user ? [{ userId: user.id }] : []),
    ],
  }

  const orderFilter: Record<string, unknown> = {
    OR: [
      ...(orgId ? [{ orgId }] : []),
      ...(user ? [{ userId: user.id }] : []),
    ],
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
  let dbError = false
  let recentShipments: Array<{
    id: string
    name: string | null
    status: keyof typeof statusConfig
    updatedAt: Date
    label?: { deviceId: string; batteryPct: number | null; lastSeenAt: Date | null; status: string } | null
    locations: Array<{
      id: string
      latitude: number
      longitude: number
      recordedAt: Date
      accuracyM: number | null
      batteryPct: number | null
      geocodedCity: string | null
      geocodedArea: string | null
      geocodedCountry: string | null
      geocodedCountryCode: string | null
    }>
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
        where: { ...where, status: { in: ['IN_TRANSIT', 'PENDING'] } },
        include: {
          label: {
            select: { deviceId: true, batteryPct: true, lastSeenAt: true, status: true },
          },
          locations: {
            where: { source: 'CELL_TOWER' },
            select: {
              id: true,
              latitude: true,
              longitude: true,
              recordedAt: true,
              accuracyM: true,
              batteryPct: true,
              geocodedCity: true,
              geocodedArea: true,
              geocodedCountry: true,
              geocodedCountryCode: true,
            },
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
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
    dbError = true
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
      href: '/labels',
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

  // Resolve org name from Clerk
  let orgName: string | null = null
  if (orgId) {
    try {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
      const org = await clerk.organizations.getOrganization({ organizationId: orgId })
      orgName = org.name
    } catch {
      // Fallback: don't show org name if Clerk fetch fails
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title="Dashboard"
          description="Overview of your shipments and tracking labels"
          action={
          <>
            <AddExistingLabelsButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Package className="mr-2 h-4 w-4" />
                  New Shipment
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/cargo/new">
                    <Truck className="mr-2 h-4 w-4" />
                    Track Cargo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dispatch/new">
                    <Send className="mr-2 h-4 w-4" />
                    Label Dispatch
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        />
        {orgName && (
          <p className="mt-1 text-sm text-muted-foreground">
            {orgName}
          </p>
        )}
      </div>

      {dbError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            Could not load dashboard data. Some stats may be outdated. Please refresh the page to try again.
          </p>
        </div>
      )}

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

      {/* Live Shipment Tracker */}
      {recentShipments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            {totalLabels > 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto max-w-sm space-y-4">
                  <h3 className="text-lg font-semibold">You have {totalLabels} label{totalLabels === 1 ? '' : 's'} ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a shipment to attach a label and start tracking your cargo in real-time.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <Link href="/cargo/new">
                        <Truck className="mr-2 h-4 w-4" />
                        Track Cargo
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/dispatch/new">
                        <Send className="mr-2 h-4 w-4" />
                        Label Dispatch
                      </Link>
                    </Button>
                  </div>
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
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Map */}
          <DashboardMap
            shipments={recentShipments
              .filter((s) => s.locations[0])
              .map((s) => {
                const loc = s.locations[0]
                const lastUpdate = getLastUpdateDate({
                  locationRecordedAt: loc.recordedAt,
                  labelLastSeenAt: s.label?.lastSeenAt,
                })
                return {
                  id: s.id,
                  name: s.name || 'Unnamed Cargo',
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  locationName: formatLocationName(loc),
                  lastUpdate: lastUpdate?.toISOString() ?? null,
                  batteryPct: s.label?.batteryPct ?? null,
                }
              })}
          />

          {/* Active Shipments List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Shipments</CardTitle>
                <CardDescription>Shipments currently in transit or pending pickup</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/shipments">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentShipments.map((shipment) => {
                  const status = statusConfig[shipment.status]
                  const label = shipment.label
                  const loc = shipment.locations[0]
                  const locationName = loc ? formatLocationName(loc) : null
                  const countryCode = loc ? getLocationCountryCode(loc) : null
                  const flag = countryCode ? countryCodeToFlag(countryCode) : null
                  const lastUpdate = getLastUpdateDate({
                    locationRecordedAt: loc?.recordedAt,
                    labelLastSeenAt: label?.lastSeenAt,
                  })

                  // Signal freshness: green <1h, yellow <24h, red >24h
                  const msSinceUpdate = lastUpdate ? now.getTime() - lastUpdate.getTime() : null
                  const signalColor =
                    msSinceUpdate === null
                      ? 'bg-muted-foreground/30'
                      : msSinceUpdate < 60 * 60 * 1000
                        ? 'bg-green-500'
                        : msSinceUpdate < 24 * 60 * 60 * 1000
                          ? 'bg-yellow-500'
                          : 'bg-red-500'

                  return (
                    <Link
                      key={shipment.id}
                      href={`/shipments/${shipment.id}`}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        {/* Signal indicator */}
                        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${signalColor}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {shipment.name || 'Unnamed Cargo'}
                            </span>
                            <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                            {flag && <span>{flag}</span>}
                            {locationName ? (
                              <span className="truncate">{locationName}</span>
                            ) : (
                              <span className="italic">No location yet</span>
                            )}
                            {lastUpdate && (
                              <>
                                <span className="text-muted-foreground/50">·</span>
                                <span className="shrink-0">{timeAgo(lastUpdate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
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
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
