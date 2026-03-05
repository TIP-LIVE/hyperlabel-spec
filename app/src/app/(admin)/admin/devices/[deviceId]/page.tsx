import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { format, formatDistanceToNow } from 'date-fns'
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
  ACTIVE: 'bg-green-500/20 text-green-400',
  INVENTORY: 'bg-gray-500/20 text-gray-400',
  SOLD: 'bg-blue-500/20 text-blue-400',
  DEPLETED: 'bg-red-500/20 text-red-400',
}

const shipmentStatusColors: Record<string, string> = {
  PENDING: 'bg-gray-500/20 text-gray-400',
  IN_TRANSIT: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

export default async function DeviceDetailPage({ params }: PageProps) {
  const { deviceId } = await params

  const label = await db.label.findUnique({
    where: { deviceId },
    include: {
      locations: {
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
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to devices
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono text-white">{label.deviceId}</h1>
          {onomondoSim && (
            <a
              href={`https://app.onomondo.com/sims/${onomondoSim.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-purple-400 hover:border-purple-400/50 hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Onomondo
            </a>
          )}
          <Badge className={statusColors[label.status]}>{label.status}</Badge>
          {isNoSignal && (
            <Badge className="bg-red-500/20 text-red-400">
              <WifiOff className="mr-1 h-3 w-3" />
              No Signal
            </Badge>
          )}
          {isLowBattery && (
            <Badge className="bg-yellow-500/20 text-yellow-400">
              <Battery className="mr-1 h-3 w-3" />
              Low Battery
            </Badge>
          )}
        </div>
      </div>

      {/* Device Info Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500">Battery</p>
            <p className={`text-2xl font-bold ${
              label.batteryPct === null
                ? 'text-gray-500'
                : label.batteryPct < 20
                  ? 'text-red-400'
                  : label.batteryPct < 50
                    ? 'text-yellow-400'
                    : 'text-green-400'
            }`}>
              {label.batteryPct !== null ? `${label.batteryPct}%` : 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500">Last Ping</p>
            <p className="text-lg font-bold text-white">
              {lastLocation
                ? formatDistanceToNow(new Date(lastLocation.recordedAt), { addSuffix: true })
                : 'Never'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500">Total Events</p>
            <p className="text-2xl font-bold text-white">{label.locations.length}</p>
            <p className="text-xs text-gray-500">last 100 shown</p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500">Shipments</p>
            <p className="text-2xl font-bold text-white">{label.shipments.length}</p>
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
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white">Device Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">IMEI</p>
              <p className="font-mono text-sm text-gray-300">{label.imei || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ICCID</p>
              <p className="font-mono text-sm text-gray-300">{label.iccid || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Firmware</p>
              <p className="text-sm text-gray-300">{label.firmwareVersion || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Activated</p>
              <p className="text-sm text-gray-300">
                {label.activatedAt ? format(new Date(label.activatedAt), 'PP') : '—'}
              </p>
            </div>
            {orgIds.length > 0 && (
              <div>
                <p className="text-xs text-gray-500">Organizations</p>
                <p className="text-sm text-gray-300">
                  {orgIds.length} org{orgIds.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Location */}
      {lastLocation && (
        <Card className="border-gray-800 bg-gray-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-white">
              Last Known Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              {lastLocation.geocodedCity && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-300">
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
              <div className="flex items-center gap-1 text-xs text-gray-400">
                {lastLocation.source === 'CELL_TOWER' ? (
                  <>
                    <Radio className="h-3 w-3 text-purple-400" />
                    Onomondo
                  </>
                ) : (
                  <>
                    <Satellite className="h-3 w-3 text-blue-400" />
                    Device
                  </>
                )}
              </div>
              {lastLocation.accuracyM && (
                <span className="text-xs text-gray-500">
                  ±{lastLocation.accuracyM}m
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location History Table */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Location History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs text-gray-400">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Accuracy</th>
                  <th className="pb-2 font-medium">Battery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {label.locations.map((loc) => (
                  <tr key={loc.id} className="text-xs">
                    <td className="py-2 text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span title={format(new Date(loc.recordedAt), 'PPpp')}>
                          {formatDistanceToNow(new Date(loc.recordedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <div>
                        {loc.geocodedCity && (
                          <span className="text-gray-300">{loc.geocodedCity} </span>
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
                        <span className="inline-flex items-center gap-1 text-purple-400">
                          <Radio className="h-3 w-3" /> Onomondo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-400">
                          <Satellite className="h-3 w-3" /> Device
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-gray-400">
                      {loc.accuracyM ? `±${loc.accuracyM}m` : '—'}
                    </td>
                    <td className="py-2">
                      {loc.batteryPct !== null ? (
                        <span className={`inline-flex items-center gap-1 ${
                          loc.batteryPct < 20
                            ? 'text-red-400'
                            : loc.batteryPct < 50
                              ? 'text-yellow-400'
                              : 'text-green-400'
                        }`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                            loc.batteryPct < 20
                              ? 'bg-red-400'
                              : loc.batteryPct < 50
                                ? 'bg-yellow-400'
                                : 'bg-green-400'
                          }`} />
                          {loc.batteryPct}%
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {label.locations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
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
        <Card className="border-gray-800 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white">Shipment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {label.shipments.map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/admin/shipments?q=${label.deviceId}`}
                  className="flex items-center justify-between rounded-lg border border-gray-700 p-3 transition-colors hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {shipment.name || 'Unnamed shipment'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(shipment.createdAt), 'PP')}
                        {shipment.destinationAddress && (
                          <> &rarr; {shipment.destinationAddress}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {shipment.deliveredAt && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(shipment.deliveredAt), 'PP')}
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
