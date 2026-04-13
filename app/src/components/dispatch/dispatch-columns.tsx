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
import { MoreHorizontal, Eye, Share2, Send, Trash2, Loader2, Copy, ArrowRight } from 'lucide-react'
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
import { toast } from 'sonner'
import { shipmentStatusConfig } from '@/lib/status-config'

function DispatchActionsCell({ shipment, isAdmin }: { shipment: DispatchRow; isAdmin: boolean }) {
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
          {isAdmin && shipment.status !== 'CANCELLED' && (
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
  addressSubmittedAt: string | null
  shipmentLabels?: Array<{
    label: {
      id: string
      deviceId: string
      batteryPct: number | null
      status: string
      lastSeenAt: string | null
    }
  }>
}

type NextStepDescriptor = {
  kind: 'none' | 'awaiting-receiver' | 'awaiting-warehouse' | 'in-transit' | 'attach-to-cargo'
  label: string
  tone: 'muted' | 'passive' | 'actionable'
  action?:
    | { type: 'copy-share-link' }
    | { type: 'link'; href: string }
}

export function getDispatchNextStep(
  row: Pick<DispatchRow, 'status' | 'addressSubmittedAt' | 'destinationAddress'>,
): NextStepDescriptor {
  switch (row.status) {
    case 'CANCELLED':
      return { kind: 'none', label: '—', tone: 'muted' }
    case 'IN_TRANSIT':
      return { kind: 'in-transit', label: 'On the way', tone: 'passive' }
    case 'DELIVERED':
      return {
        kind: 'attach-to-cargo',
        label: 'Attach to cargo',
        tone: 'actionable',
        action: { type: 'link', href: '/cargo/new' },
      }
    case 'PENDING':
      if (!row.addressSubmittedAt && !row.destinationAddress) {
        return {
          kind: 'awaiting-receiver',
          label: 'Awaiting receiver details',
          tone: 'actionable',
          action: { type: 'copy-share-link' },
        }
      }
      return {
        kind: 'awaiting-warehouse',
        label: 'Awaiting dispatch from warehouse',
        tone: 'passive',
      }
  }
}

function NextStepCell({ row }: { row: DispatchRow }) {
  const descriptor = getDispatchNextStep(row)

  if (descriptor.tone === 'muted') {
    return <span className="text-muted-foreground text-xs">{descriptor.label}</span>
  }

  if (descriptor.tone === 'passive') {
    return <span className="text-muted-foreground text-sm">{descriptor.label}</span>
  }

  // actionable
  if (descriptor.action?.type === 'copy-share-link') {
    const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${row.shareCode}`
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 gap-1.5"
            onClick={() => {
              navigator.clipboard
                .writeText(trackingUrl)
                .then(() => toast.success('Share link copied'))
                .catch(() => toast.error('Could not copy link'))
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            {descriptor.label}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Copy and send this link to the receiver — they&apos;ll fill in their address.
        </TooltipContent>
      </Tooltip>
    )
  }

  if (descriptor.action?.type === 'link') {
    return (
      <Button variant="link" size="sm" className="h-auto p-0 gap-1.5" asChild>
        <Link href={descriptor.action.href}>
          <ArrowRight className="h-3.5 w-3.5" />
          {descriptor.label}
        </Link>
      </Button>
    )
  }

  return <span className="text-muted-foreground text-sm">{descriptor.label}</span>
}

export function getDispatchColumns({ isAdmin }: { isAdmin: boolean }): ColumnDef<DispatchRow>[] {
  return [
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
            <span className="text-xs text-muted-foreground">
              {labelCount} label{labelCount !== 1 ? 's' : ''}
            </span>
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
    id: 'nextStep',
    header: 'Next Step',
    cell: ({ row }) => <NextStepCell row={row.original} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => <DispatchActionsCell shipment={row.original} isAdmin={isAdmin} />,
  },
]
}
