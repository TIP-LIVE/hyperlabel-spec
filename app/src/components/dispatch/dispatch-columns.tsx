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
import { MoreHorizontal, Eye, Share2, Send, Trash2, Loader2 } from 'lucide-react'
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
import { useRouter } from 'next/navigation'
import { timeAgo } from '@/lib/utils/time-ago'
import { toast } from 'sonner'
import { shipmentStatusConfig } from '@/lib/status-config'
import { countryCodeToFlag } from '@/lib/utils/country-flag'

function DispatchActionsCell({ shipment }: { shipment: DispatchRow }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${shipment.shareCode}`

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/v1/dispatch/${shipment.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel dispatch')
      }
      toast.success('Dispatch cancelled')
      setDeleteOpen(false)
      router.refresh()
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
            <AlertDialogTitle>Delete Dispatch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {shipment.name || 'this dispatch'}
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
            <Link
              href="/labels"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              {labelCount} label{labelCount !== 1 ? 's' : ''}
            </Link>
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

      const locationText = `${loc.geocodedCity}${loc.geocodedCountry ? `, ${loc.geocodedCountry}` : ''}`
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 max-w-[200px]">
              {loc.geocodedCountryCode && (
                <span className="text-sm shrink-0">{countryCodeToFlag(loc.geocodedCountryCode)}</span>
              )}
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
    id: 'lastUpdate',
    header: 'Last Update',
    cell: ({ row }) => {
      const locTime = row.original.latestLocation?.recordedAt
        ? new Date(row.original.latestLocation.recordedAt).getTime()
        : 0
      const seenTime = Math.max(
        0,
        ...(row.original.shipmentLabels || [])
          .map((sl) => sl.label.lastSeenAt ? new Date(sl.label.lastSeenAt).getTime() : 0)
      )
      const timestamp = locTime >= seenTime
        ? row.original.latestLocation?.recordedAt
        : (row.original.shipmentLabels || [])
            .map((sl) => sl.label.lastSeenAt)
            .filter(Boolean)
            .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]
      if (!timestamp) {
        return <span className="text-muted-foreground text-xs">—</span>
      }
      return (
        <span className="text-muted-foreground text-xs">
          {timeAgo(timestamp)}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DispatchActionsCell shipment={row.original} />,
  },
]
