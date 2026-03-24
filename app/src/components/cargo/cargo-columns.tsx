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
import { MoreHorizontal, Eye, Share2, Truck, Battery, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import { useState } from 'react'
import { timeAgo } from '@/lib/utils/time-ago'
import { toast } from 'sonner'
import { shipmentStatusConfig } from '@/lib/status-config'
import { getLastUpdateMs, formatLocationName, getLocationCountryCode } from '@/lib/utils/location-display'
import { countryCodeToFlag } from '@/lib/utils/country-flag'

function CargoActionsCell({ shipment }: { shipment: CargoRow }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${shipment.shareCode}`

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/v1/cargo/${shipment.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel cargo shipment')
      }
      toast.success('Cargo shipment cancelled')
      setDeleteOpen(false)
      window.dispatchEvent(new CustomEvent('cargo-list-refresh'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
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
            <Link href={`/cargo/${shipment.id}`}>
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
          {shipment.status !== 'CANCELLED' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cargo Shipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {shipment.name || 'this cargo shipment'}
              </span>
              ? This will cancel tracking and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export type CargoRow = {
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
    lastSeenAt: string | null
    lastLatitude: number | null
    lastLongitude: number | null
  } | null
  latestLocation: {
    id: string
    latitude: number
    longitude: number
    recordedAt: string
    receivedAt: string
    geocodedCity: string | null
    geocodedCountry: string | null
    geocodedCountryCode: string | null
  } | null
}

function getLastUpdateTime(row: CargoRow): number {
  // Only show a "Last Update" when there is actual location data.
  // labelLastSeenAt alone (heartbeat webhooks with no location) is misleading
  // for shipments that were never tracked — it would show a stale timestamp
  // next to "No data yet".
  if (!row.latestLocation) return 0
  return getLastUpdateMs({
    locationRecordedAt: row.latestLocation.recordedAt,
    labelLastSeenAt: row.label?.lastSeenAt,
  })
}

function SortableHeader({ column, label }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void }; label: string }) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="ml-1 h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-1 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
      )}
    </Button>
  )
}

export const cargoColumns: ColumnDef<CargoRow>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column} label="Cargo" />,
    cell: ({ row }) => {
      const name = row.getValue('name') as string | null
      return (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0 text-muted-foreground">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <Link
              href={`/cargo/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {name || 'Unnamed Cargo'}
            </Link>
            <p className="text-xs text-muted-foreground">
              {row.original.label?.deviceId || '—'}
            </p>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <SortableHeader column={column} label="Status" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as CargoRow['status']
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
      const label = row.original.label

      // Try location event first, then label's cached coordinates
      const displaySource = loc ?? (label?.lastLatitude != null ? {
        latitude: label.lastLatitude,
        longitude: label.lastLongitude,
        geocodedCity: null as string | null,
        geocodedCountry: null as string | null,
        geocodedCountryCode: null as string | null,
      } : null)

      if (!displaySource) {
        return <span className="text-muted-foreground text-xs">No data yet</span>
      }

      const locationText = formatLocationName(displaySource)
      const countryCode = getLocationCountryCode(displaySource)

      if (!locationText) {
        return <span className="text-muted-foreground text-xs">No data yet</span>
      }

      if (!countryCode) {
        return (
          <span className="text-muted-foreground text-xs">
            {locationText}
          </span>
        )
      }

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 max-w-[200px]">
              <span className="text-sm shrink-0">{countryCodeToFlag(countryCode)}</span>
              <span className="text-sm truncate">
                {locationText}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{locationText}</p>
          </TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: 'label.batteryPct',
    header: ({ column }) => <SortableHeader column={column} label="Battery" />,
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
    accessorFn: (row) => getLastUpdateTime(row),
    header: ({ column }) => <SortableHeader column={column} label="Last Update" />,
    cell: ({ row }) => {
      const timestamp = getLastUpdateTime(row.original)
      if (!timestamp) {
        return <span className="text-muted-foreground text-xs">—</span>
      }
      return (
        <span className="text-muted-foreground text-xs">
          {timeAgo(timestamp)}
        </span>
      )
    },
    sortingFn: 'basic',
  },
  {
    id: 'actions',
    cell: ({ row }) => <CargoActionsCell shipment={row.original} />,
  },
]
