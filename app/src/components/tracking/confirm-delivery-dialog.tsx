'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Loader2, Package, Power } from 'lucide-react'
import { toast } from 'sonner'

interface ConfirmDeliveryDialogProps {
  shareCode: string
  shipmentName?: string | null
  onDeliveryConfirmed?: () => void
}

export function ConfirmDeliveryDialog({
  shareCode,
  shipmentName,
  onDeliveryConfirmed,
}: ConfirmDeliveryDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [consigneeName, setConsigneeName] = useState('')

  async function handleConfirm() {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/v1/track/${shareCode}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          consigneeName: consigneeName || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm delivery')
      }

      setIsConfirmed(true)
      toast.success('Delivery confirmed! The shipper has been notified.')
      
      // Call callback after brief delay to show success state
      setTimeout(() => {
        onDeliveryConfirmed?.()
        setOpen(false)
      }, 2000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Power className="h-5 w-5" />
          Confirm Delivery & Stop Tracking
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        {isConfirmed ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Delivery Confirmed!</h3>
            <p className="mt-2 text-muted-foreground">
              The shipper has been notified. Tracking will now stop.
            </p>
          </div>
        ) : (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
                  <AlertDialogDescription className="mt-1">
                    {shipmentName || 'This shipment'}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                By confirming delivery, you acknowledge that you have received this
                shipment. Tracking will stop and the shipper will be notified.
              </p>

              <div className="space-y-2">
                <Label htmlFor="consigneeName">Your Name (optional)</Label>
                <Input
                  id="consigneeName"
                  placeholder="Enter your name"
                  value={consigneeName}
                  onChange={(e) => setConsigneeName(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  This will be included in the delivery notification
                </p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirm()
                }}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Confirm Delivery
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
