'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Truck, CheckCircle, RefreshCw, MoreHorizontal, XCircle, Mail, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CancelDispatchDialog } from '@/components/dispatch/cancel-dispatch-dialog'
import { LabelScanDialog } from '@/components/dispatch/label-scan-dialog'
import { toast } from 'sonner'

type DispatchStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'

interface DispatchAdminActionsProps {
  shipmentId: string
  shipmentName: string | null
  status: DispatchStatus
  destinationAddress: string | null
  labelCount: number | null
  consigneeEmail: string | null
  shareCode: string
}

export function DispatchAdminActions({
  shipmentId,
  shipmentName,
  status,
  destinationAddress,
  labelCount,
  consigneeEmail,
  shareCode,
}: DispatchAdminActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const isActive = status === 'PENDING' || status === 'IN_TRANSIT'
  const missingReceiverAddress = status === 'PENDING' && !destinationAddress

  async function sendReminder() {
    setSendingReminder(true)
    try {
      const res = await fetch(`/api/v1/dispatch/${shipmentId}/send-reminder`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send reminder')
      }
      toast.success('Reminder email sent to receiver')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminder')
    } finally {
      setSendingReminder(false)
    }
  }

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
      {status === 'PENDING' &&
        (missingReceiverAddress ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="default" size="sm" className="gap-1.5 pointer-events-none" disabled>
                    <Truck className="h-3.5 w-3.5" />
                    Scan & Ship
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Waiting on the receiver to submit their delivery address. Fill it in via Edit first, or wait for
                them to use the share link.
              </TooltipContent>
            </Tooltip>
            {consigneeEmail && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={sendReminder}
                disabled={sendingReminder}
              >
                {sendingReminder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Send Reminder
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={() => setScanOpen(true)}
          >
            <Truck className="h-3.5 w-3.5" />
            Scan & Ship
          </Button>
        ))}
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
          onClick={() => patchStatus('IN_TRANSIT', 'Dispatch reactivated', 'Failed to reactivate dispatch')}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reactivate Dispatch
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
          <CancelDispatchDialog
            shipmentId={shipmentId}
            shipmentName={shipmentName}
            open={cancelOpen}
            onOpenChange={setCancelOpen}
          />
        </>
      )}
      <LabelScanDialog
        shipmentId={shipmentId}
        shipmentName={shipmentName}
        labelCount={labelCount}
        open={scanOpen}
        onOpenChange={setScanOpen}
        onConfirmed={() => window.location.reload()}
      />
    </div>
  )
}
