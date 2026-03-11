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
import { MoreHorizontal, Eye, Share2, Send } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { shipmentStatusConfig } from '@/lib/status-config'
import { countryCodeToFlag } from '@/lib/utils/country-flag'

export type DispatchRow = {
  id: string
  name: string | null
  destinationAddress: string | null
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  shareCode: string
  createdAt: Date
  shipmentLabels?: Array<{
    label: {
      id: string
      deviceId: string
      batteryPct: number | null
      status: string
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

export const dispatchColumns: ColumnDef<DispatchRow>[] = [
  {
    accessorKey: 'name',
    header: 'Dispatch',
    cell: ({ row }) => {
      const name = row.getValue('name') as string | null
      const labelCount = row.original.shipmentLabels?.length || 0

      return (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0 text-muted-foreground">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <Link
              href={`/dispatch/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {name || 'Unnamed Dispatch'}
            </Link>
            <p className="text-xs text-muted-foreground">
              {labelCount} label{labelCount !== 1 ? 's' : ''}
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
      const status = row.getValue('status') as DispatchRow['status']
      const config = shipmentStatusConfig[status]
      return <Badge variant={config.variant}>{config.label}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'destinationAddress',
    header: 'Destination',
    cell: ({ row }) => {
      const dest = row.getValue('destinationAddress') as string | null
      if (!dest) return <span className="text-muted-foreground text-xs">Not specified</span>
      return <span className="text-sm truncate max-w-[200px] block">{dest}</span>
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

      if (!loc.geocodedCity) {
        return (
          <span className="text-muted-foreground text-xs">
            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
          </span>
        )
      }

      return (
        <div className="flex items-center gap-2 max-w-[200px]">
          {loc.geocodedCountryCode && (
            <span className="text-sm shrink-0">{countryCodeToFlag(loc.geocodedCountryCode)}</span>
          )}
          <span className="text-sm truncate">
            {loc.geocodedCity}{loc.geocodedCountry ? `, ${loc.geocodedCountry}` : ''}
          </span>
        </div>
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
              <Link href={`/dispatch/${shipment.id}`}>
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
