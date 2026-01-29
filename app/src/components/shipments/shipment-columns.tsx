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
import { MoreHorizontal, Eye, Share2, MapPin } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

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
}

const statusConfig: Record<
  ShipmentRow['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' },
  DELIVERED: { label: 'Delivered', variant: 'outline' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
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
    accessorKey: 'destinationAddress',
    header: 'Destination',
    cell: ({ row }) => {
      const address = row.getValue('destinationAddress') as string | null
      if (!address) return <span className="text-muted-foreground">—</span>
      return (
        <div className="flex items-center gap-1 max-w-[200px]">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate text-sm">{address}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as ShipmentRow['status']
      const config = statusConfig[status]
      return <Badge variant={config.variant}>{config.label}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'label.batteryPct',
    header: 'Battery',
    cell: ({ row }) => {
      const battery = row.original.label.batteryPct
      if (battery === null) return <span className="text-muted-foreground">—</span>
      return (
        <span className={battery < 20 ? 'text-destructive font-medium' : ''}>
          {battery}%
        </span>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date
      return (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(date), { addSuffix: true })}
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
            <Button variant="ghost" className="h-8 w-8 p-0">
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
