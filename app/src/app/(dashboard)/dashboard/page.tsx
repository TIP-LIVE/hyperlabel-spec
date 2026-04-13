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
import { Package, MapPin, Truck, Battery, ArrowRight, AlertCircle, Send, ChevronDown } from 'lucide-react'
import { JourneyCard } from '@/components/dashboard/journey-card'
import { resolveUserPhase } from '@/lib/user-phase'
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

  // B2B: org is top-level — all org members see same data
  const where: Record<string, unknown> = orgId
    ? { orgId }
    : user ? { userId: user.id } : {}

  const orderFilter: Record<string, unknown> = orgId
    ? { orgId }
    : user ? { userId: user.id } : {}

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
        where: { ...where, status: { in: ['IN_TRANSIT', 'PENDING'] }, type: 'CARGO_TRACKING' },
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
          type: 'CARGO_TRACKING',
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

  // Resolve which phase of the first-impression journey the user is in
  const phaseData = user
    ? await resolveUserPhase({ userId: user.id, orgId }).catch((err) => {
        console.error('[Dashboard] phase resolution failed:', err)
        return null
      })
    : null

  const stats = [
    {
      name: 'Active Shipments',
      value: activeShipments.toString(),
      icon: Truck,
      description: 'Pending or in transit',
      href: '/cargo',
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
      href: '/cargo?status=DELIVERED',
    },
    {
      name: 'Low Battery',
      value: lowBatteryLabels.toString(),
      icon: Battery,
      description: lowBatteryLabels > 0 ? 'Needs attention' : 'All good',
      alert: lowBatteryLabels > 0,
      href: '/cargo',
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
                {/* Phase 0-2 users need Dispatch first; Phase 3+ need Track Cargo first */}
                {phaseData && (phaseData.phase === 0 || phaseData.phase === 1 || phaseData.phase === '1b' || phaseData.phase === 2) ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dispatch/new">
                        <Send className="mr-2 h-4 w-4" />
                        Label Dispatch
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/cargo/new">
                        <Truck className="mr-2 h-4 w-4" />
                        Track Cargo
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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

      {/* Stats — hidden in empty state, zero-value cards filtered out */}
      {stats.filter((s) => s.value !== '0').length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.filter((s) => s.value !== '0').map((stat) => (
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
      )}

      {/* Journey card (first-impression experience) — hide once live cargo exists */}
      {phaseData && phaseData.phase !== 5 && <JourneyCard phaseData={phaseData} />}

      {/* Live Shipment Tracker */}
      {recentShipments.length === 0 ? null : (
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
                <Link href="/cargo">
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
                  const countryCode = loc ? getLocationCountryCode(loc) : (shipment.type === 'LABEL_DISPATCH' ? shipment.destinationCountry : null)
                  const flag = countryCode ? countryCodeToFlag(countryCode) : null
                  const lastUpdate = getLastUpdateDate({
                    locationRecordedAt: loc?.recordedAt,
                    labelLastSeenAt: label?.lastSeenAt,
                  })

                  // Label Dispatch: dot color follows shipment status
                  // Cargo Tracking: dot color follows IoT signal freshness
                  const msSinceUpdate = lastUpdate ? now.getTime() - lastUpdate.getTime() : null
                  const signalColor =
                    shipment.type === 'LABEL_DISPATCH'
                      ? status.dotColor
                      : msSinceUpdate === null
                        ? 'bg-muted-foreground/30'
                        : msSinceUpdate < 60 * 60 * 1000
                          ? 'bg-green-500'
                          : msSinceUpdate < 24 * 60 * 60 * 1000
                            ? 'bg-yellow-500'
                            : 'bg-red-500'

                  return (
                    <Link
                      key={shipment.id}
                      href={shipment.type === 'LABEL_DISPATCH' ? `/dispatch/${shipment.id}` : `/cargo/${shipment.id}`}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Signal indicator */}
                        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${signalColor}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {shipment.name || (shipment.type === 'LABEL_DISPATCH' ? 'Label Dispatch' : 'Unnamed Cargo')}
                            </span>
                            <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                            {flag && <span>{flag}</span>}
                            {locationName ? (
                              <span className="truncate">{locationName}</span>
                            ) : shipment.type === 'LABEL_DISPATCH' && shipment.destinationCity ? (
                              <span className="truncate">To {shipment.destinationCity}{shipment.destinationCountry ? `, ${shipment.destinationCountry}` : ''}</span>
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
