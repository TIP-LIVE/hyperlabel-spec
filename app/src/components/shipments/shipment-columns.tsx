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
import { Skeleton } from '@/components/ui/skeleton'
import { MoreHorizontal, Eye, Share2, Battery } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { shipmentStatusConfig } from '@/lib/status-config'
import { countryCodeToFlag } from '@/lib/utils/country-flag'
import type { GeocodedLocation } from '@/hooks/use-reverse-geocode'

export type ShipmentRow = {
  id: string
  name: string | null
  destinationAddress: string | null
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  shareCode: string
  createdAt: Date
  label: {
    id: string
    deviceId: string
    batteryPct: number | null
    status: string
  }
  latestLocation: {
    id: string
    latitude: number
    longitude: number
    recordedAt: string
  } | null
  locationInfo?: GeocodedLocation
}

export const shipmentColumns: ColumnDef<ShipmentRow>[] = [
  {
    accessorKey: 'name',
    header: 'Shipment',
    cell: ({ row }) => {
      const name = row.getValue('name') as string | null
      return (
        <div>
          <Link
            href={`/shipments/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {name || 'Untitled Shipment'}
          </Link>
          <p className="text-xs text-muted-foreground">{row.original.label.deviceId}</p>
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
      const info = row.original.locationInfo
      const loc = row.original.latestLocation

      if (!loc) {
        return <span className="text-muted-foreground text-xs">No data yet</span>
      }

      if (!info) {
        return <Skeleton className="h-5 w-24" />
      }

      return (
        <div className="flex items-center gap-2 max-w-[200px]">
          {info.countryCode && (
            <span className="text-sm shrink-0">{countryCodeToFlag(info.countryCode)}</span>
          )}
          <span className="text-sm truncate">{info.name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'label.batteryPct',
    header: 'Battery',
    cell: ({ row }) => {
      const battery = row.original.label.batteryPct
      if (battery === null) return <span className="text-muted-foreground text-xs">—</span>
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
      const loc = row.original.latestLocation
      if (!loc) {
        return <span className="text-muted-foreground text-xs">—</span>
      }
      return (
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(loc.recordedAt), { addSuffix: true })}
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
              <Link href={`/shipments/${shipment.id}`}>
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
