'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Truck, CheckCircle, RefreshCw, MoreHorizontal, XCircle } from 'lucide-react'
import { CancelShipmentDialog } from '@/components/shipments/cancel-shipment-dialog'
import { toast } from 'sonner'

type DispatchStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'

interface DispatchAdminActionsProps {
  shipmentId: string
  shipmentName: string | null
  status: DispatchStatus
}

export function DispatchAdminActions({ shipmentId, shipmentName, status }: DispatchAdminActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const isActive = status === 'PENDING' || status === 'IN_TRANSIT'

  async function patchStatus(nextStatus: DispatchStatus, successMsg: string, errorMsg: string) {
    try {
      const res = await fetch(`/api/v1/dispatch/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error(errorMsg)
      toast.success(successMsg)
      window.location.reload()
    } catch {
      toast.error(errorMsg)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'PENDING' && (
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={() => patchStatus('IN_TRANSIT', 'Dispatch marked as in transit', 'Failed to update status')}
        >
          <Truck className="h-3.5 w-3.5" />
          Mark as In Transit
        </Button>
      )}
      {status === 'IN_TRANSIT' && (
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 bg-green-600 hover:bg-green-700"
          onClick={() => patchStatus('DELIVERED', 'Dispatch marked as delivered', 'Failed to mark as delivered')}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Mark as Delivered
        </Button>
      )}
      {status === 'DELIVERED' && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => patchStatus('IN_TRANSIT', 'Tracking reactivated', 'Failed to reactivate tracking')}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reactivate Tracking
        </Button>
      )}
      {status === 'CANCELLED' && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => patchStatus('PENDING', 'Dispatch reactivated', 'Failed to reactivate dispatch')}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reactivate
        </Button>
      )}
      {isActive && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setCancelOpen(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Dispatch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <CancelShipmentDialog
            shipmentId={shipmentId}
            shipmentName={shipmentName}
            apiBasePath="/api/v1/dispatch"
            open={cancelOpen}
            onOpenChange={setCancelOpen}
          />
        </>
      )}
    </div>
  )
}
