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
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface MarkPaidButtonProps {
  orderId: string
  orderShortId: string
  quantity: number
}

export function MarkPaidButton({ orderId, orderShortId, quantity }: MarkPaidButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/mark-paid`, {
        method: 'POST',
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Request failed' }))
        toast.error(error || 'Failed to mark paid')
        return
      }
      const { assignedLabels, requestedQuantity } = await res.json()
      if (assignedLabels < requestedQuantity) {
        toast.warning(
          `Order ${orderShortId} marked paid, but only ${assignedLabels}/${requestedQuantity} labels in inventory.`,
        )
      } else {
        toast.success(`Order ${orderShortId} marked paid. ${assignedLabels} labels allocated.`)
      }
      router.refresh()
    } catch (error) {
      console.error('Error marking order paid:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Mark as Paid
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Confirm invoice payment received
          </AlertDialogTitle>
          <AlertDialogDescription>
            Marking order {orderShortId} as paid will allocate {quantity} label
            {quantity === 1 ? '' : 's'} from warehouse inventory to this organisation and unlock
            dispatch. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark as Paid
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
