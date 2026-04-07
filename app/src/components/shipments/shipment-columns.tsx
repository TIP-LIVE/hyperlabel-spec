'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Share2, MapPin, Truck, Send, Battery } from 'lucide-react'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils/time-ago'
import { shipmentStatusConfig } from '@/lib/status-config'
import { countryCodeToFlag } from '@/lib/utils/country-flag'
import { getLastUpdateDate, formatLocationName, getLocationCountryCode } from '@/lib/utils/location-display'

export type ShipmentRow = {
  id: string
  name: string | null
  type: 'CARGO_TRACKING' | 'LABEL_DISPATCH'
  destinationAddress: string | null
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  shareCode: string
  createdAt: Date
  label: {
    id: string
    deviceId: string
    displayId: string | null
    batteryPct: number | null
    status: string
    lastSeenAt: string | null
  } | null
  shipmentLabels?: Array<{
    label: {
      id: string
      deviceId: string
      displayId: string | null
      batteryPct: number | null
      status: string
      lastSeenAt: string | null
    }
  }>
  latestLocation: {
    id: string
    latitude: number
    longitude: number
    recordedAt: string
    geocodedCity: string | null
    geocodedCountry: string | null
    geocodedCountryCode: string | null
  } | null
}

export const shipmentColumns: ColumnDef<ShipmentRow>[] = [
  {
    accessorKey: 'name',
    header: 'Shipment',
    cell: ({ row }) => {
      const name = row.getValue('name') as string | null
      const isDispatch = row.original.type === 'LABEL_DISPATCH'
      const labelCount = row.original.shipmentLabels?.length || 0

      return (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0 text-muted-foreground">
            {isDispatch ? <Send className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
          </div>
          <div>
            <Link
              href={`/${isDispatch ? 'dispatch' : 'cargo'}/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {name || (isDispatch ? 'Unnamed Dispatch' : 'Unnamed Cargo')}
            </Link>
            <p className="text-xs text-muted-foreground">
              {isDispatch
                ? `${labelCount} label${labelCount !== 1 ? 's' : ''}`
                : row.original.label?.displayId || row.original.label?.deviceId || '—'}
            </p>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as ShipmentRow['status']
      const config = shipmentStatusConfig[status]
      return <Badge variant={config.variant}>{config.label}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'currentLocation',
    header: 'Location',
    cell: ({ row }) => {
      const loc = row.original.latestLocation
      if (!loc) {
        return <span className="text-muted-foreground text-xs">No data yet</span>
      }

      const locationText = formatLocationName(loc)
      const countryCode = getLocationCountryCode(loc)

      if (!locationText) {
        return <span className="text-muted-foreground text-xs">No data yet</span>
      }

      if (!countryCode) {
        return <span className="text-muted-foreground text-xs">{locationText}</span>
      }

      return (
        <div className="flex items-center gap-2 max-w-[200px]">
          <span className="text-sm shrink-0">{countryCodeToFlag(countryCode)}</span>
          <span className="text-sm truncate">{locationText}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'label.batteryPct',
    header: 'Battery',
    cell: ({ row }) => {
      const battery = row.original.label?.batteryPct ?? null
      if (battery === null) return <span className="text-muted-foreground">—</span>
      const color =
        battery < 20
          ? 'text-red-600 dark:text-red-400'
          : battery < 50
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-green-600 dark:text-green-400'
      return (
        <span className={`flex items-center gap-1 text-sm ${color}`}>
          <Battery className="h-3.5 w-3.5" />
          {battery}%
        </span>
      )
    },
  },
  {
    id: 'lastUpdate',
    header: 'Last Update',
    cell: ({ row }) => {
      const lastUpdate = getLastUpdateDate({
        locationRecordedAt: row.original.latestLocation?.recordedAt,
        labelLastSeenAt: row.original.label?.lastSeenAt,
      })
      if (!lastUpdate) {
        return <span className="text-muted-foreground text-xs">—</span>
      }
      return (
        <span className="text-muted-foreground text-xs">
          {timeAgo(lastUpdate)}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const shipment = row.original
      const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${shipment.shareCode}`

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${shipment.type === 'LABEL_DISPATCH' ? 'dispatch' : 'cargo'}/${shipment.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(trackingUrl)
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Copy tracking link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
