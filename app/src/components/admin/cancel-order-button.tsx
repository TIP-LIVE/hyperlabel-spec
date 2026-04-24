'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CancelOrderButtonProps {
  orderId: string
  orderShortId: string
  assignedLabelCount: number
}

export function CancelOrderButton({
  orderId,
  orderShortId,
  assignedLabelCount,
}: CancelOrderButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/cancel`, {
        method: 'POST',
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Request failed' }))
        toast.error(error || 'Failed to cancel order')
        return
      }
      const { revertedLabels } = await res.json()
      toast.success(
        revertedLabels > 0
          ? `Order ${orderShortId} cancelled. ${revertedLabels} label${revertedLabels === 1 ? '' : 's'} returned to inventory.`
          : `Order ${orderShortId} cancelled.`,
      )
      router.refresh()
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
          <XCircle className="mr-1 h-3 w-3" />
          Cancel order
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Cancel order {orderShortId}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {assignedLabelCount > 0
              ? `This will release ${assignedLabelCount} label${assignedLabelCount === 1 ? '' : 's'} back to warehouse inventory and mark the order CANCELLED. The order row is kept for audit.`
              : `This will mark the order CANCELLED. The order row is kept for audit.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep order</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
