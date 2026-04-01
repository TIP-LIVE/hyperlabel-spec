import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { formatDateTime } from '@/lib/utils/format-date'
import { timeAgo } from '@/lib/utils/time-ago'
import {
  ArrowLeft,
  Battery,
  ExternalLink,
  MapPin,
  Satellite,
  Radio,
  Truck,
  WifiOff,
  Clock,
} from 'lucide-react'
import { BatteryTrendChart } from '@/components/admin/charts/battery-trend-chart'
import { getOnomonodoSimByIccid } from '@/lib/onomondo'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ deviceId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { deviceId } = await params
  return {
    title: `Device ${deviceId}`,
    description: `Detailed view for device ${deviceId}`,
  }
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-600 dark:text-green-400',
  INVENTORY: 'bg-gray-500/20 text-muted-foreground',
  SOLD: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  DEPLETED: 'bg-red-500/20 text-red-600 dark:text-red-400',
}

const shipmentStatusColors: Record<string, string> = {
  PENDING: 'bg-gray-500/20 text-muted-foreground',
  IN_TRANSIT: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-600 dark:text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-600 dark:text-red-400',
}

export default async function DeviceDetailPage({ params }: PageProps) {
  const { deviceId } = await params

  const label = await db.label.findUnique({
    where: { deviceId },
    include: {
      locations: {
        where: { source: 'CELL_TOWER' },
        orderBy: { recordedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          latitude: true,
          longitude: true,
          accuracyM: true,
          batteryPct: true,
          speed: true,
          recordedAt: true,
          receivedAt: true,
          isOfflineSync: true,
          source: true,
          geocodedCity: true,
          geocodedCountry: true,
        },
      },
      shipments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          shareCode: true,
          createdAt: true,
          deliveredAt: true,
          destinationAddress: true,
        },
      },
      orderLabels: {
        include: {
          order: {
            select: { id: true, orgId: true },
          },
        },
      },
    },
  })

  if (!label) {
    notFound()
  }

  // Fetch Onomondo SIM data for direct link (non-blocking)
  const onomondoSim = label.iccid
    ? await getOnomonodoSimByIccid(label.iccid).catch(() => null)
    : null

  const lastLocation = label.locations[0]
  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is fine
  const referenceTime = Date.now()
  const isNoSignal =
    !lastLocation ||
    (referenceTime - new Date(lastLocation.recordedAt).getTime()) / (1000 * 60 * 60) > 24
  const isLowBattery = label.batteryPct !== null && label.batteryPct < 20 && label.batteryPct > 0

  // Count unique orgs
  const orgIds = [...new Set(label.orderLabels.map((ol) => ol.order.orgId).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/admin/devices"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to devices
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono text-foreground">{label.deviceId}</h1>
          {onomondoSim && (
            <a
              href={`https://app.onomondo.com/sims/${onomondoSim.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-purple-600 dark:text-purple-400 hover:border-purple-500/50 dark:hover:border-purple-400/50 hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Onomondo
            </a>
          )}
          <Badge className={statusColors[label.status]}>{label.status}</Badge>
          {isNoSignal && (
            <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">
              <WifiOff className="mr-1 h-3 w-3" />
              No Signal
            </Badge>
          )}
          {isLowBattery && (
            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
              <Battery className="mr-1 h-3 w-3" />
              Low Battery
            </Badge>
          )}
        </div>
      </div>

      {/* Device Info Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Battery</p>
            <p className={`text-2xl font-bold ${
              label.batteryPct === null
                ? 'text-muted-foreground'
                : label.batteryPct < 20
                  ? 'text-red-600 dark:text-red-400'
                  : label.batteryPct < 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-green-600 dark:text-green-400'
            }`}>
              {label.batteryPct !== null ? `${label.batteryPct}%` : 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Last Ping</p>
            <p className="text-lg font-bold text-card-foreground">
              {lastLocation
                ? timeAgo(lastLocation.recordedAt)
                : 'Never'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold text-card-foreground">{label.locations.length}</p>
            <p className="text-xs text-muted-foreground">last 100 shown</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Shipments</p>
            <p className="text-2xl font-bold text-card-foreground">{label.shipments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Battery Trend Chart */}
      <BatteryTrendChart
        data={label.locations.map((loc) => ({
          recordedAt: new Date(loc.recordedAt).toISOString(),
          batteryPct: loc.batteryPct,
        }))}
      />

      {/* Device Identifiers */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-card-foreground">Device Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">IMEI</p>
              <p className="font-mono text-sm text-foreground">{label.imei || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ICCID</p>
              <p className="font-mono text-sm text-foreground">{label.iccid || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Firmware</p>
              <p className="text-sm text-foreground">{label.firmwareVersion || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Activated</p>
              <p className="text-sm text-foreground">
                {label.activatedAt ? formatDateTime(label.activatedAt) : '—'}
              </p>
            </div>
            {orgIds.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Organizations</p>
                <p className="text-sm text-foreground">
                  {orgIds.length} org{orgIds.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Location */}
      {lastLocation && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Last Known Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              {lastLocation.geocodedCity && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {lastLocation.geocodedCity}
                    {lastLocation.geocodedCountry ? `, ${lastLocation.geocodedCountry}` : ''}
                  </span>
                </div>
              )}
              <a
                href={`https://www.google.com/maps?q=${lastLocation.latitude},${lastLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {lastLocation.latitude.toFixed(5)}, {lastLocation.longitude.toFixed(5)}
              </a>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {lastLocation.source === 'CELL_TOWER' ? (
                  <>
                    <Radio className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    Onomondo
                  </>
                ) : (
                  <>
                    <Satellite className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    Device
                  </>
                )}
              </div>
              {lastLocation.accuracyM && (
                <span className="text-xs text-muted-foreground">
                  ±{lastLocation.accuracyM}m
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location History Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Location History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Accuracy</th>
                  <th className="pb-2 font-medium">Battery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {label.locations.map((loc) => (
                  <tr key={loc.id} className="text-xs">
                    <td className="py-2 text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span title={format(new Date(loc.recordedAt), 'PPpp')}>
                          {timeAgo(loc.recordedAt)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div>
                        {loc.geocodedCity && (
                          <span className="text-foreground">{loc.geocodedCity} </span>
                        )}
                        <a
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-primary hover:underline"
                        >
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </a>
                      </div>
                    </td>
                    <td className="py-2">
                      {loc.source === 'CELL_TOWER' ? (
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                          <Radio className="h-3 w-3" /> Onomondo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Satellite className="h-3 w-3" /> Device
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {loc.accuracyM ? `±${loc.accuracyM}m` : '—'}
                    </td>
                    <td className="py-2">
                      {loc.batteryPct !== null ? (
                        <span className={`inline-flex items-center gap-1 ${
                          loc.batteryPct < 20
                            ? 'text-red-600 dark:text-red-400'
                            : loc.batteryPct < 50
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                        }`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                            loc.batteryPct < 20
                              ? 'bg-red-500 dark:bg-red-400'
                              : loc.batteryPct < 50
                                ? 'bg-yellow-500 dark:bg-yellow-400'
                                : 'bg-green-500 dark:bg-green-400'
                          }`} />
                          {loc.batteryPct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {label.locations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No location events recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Shipment History */}
      {label.shipments.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Shipment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {label.shipments.map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/admin/${shipment.type === 'LABEL_DISPATCH' ? 'dispatch' : 'cargo'}?q=${label.deviceId}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {shipment.name || 'Unnamed shipment'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(shipment.createdAt)}
                        {shipment.destinationAddress && (
                          <> &rarr; {shipment.destinationAddress}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {shipment.deliveredAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(shipment.deliveredAt)}
                      </span>
                    )}
                    <Badge className={shipmentStatusColors[shipment.status]}>
                      {shipment.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
