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
import { Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CancelDispatchDialogProps {
  shipmentId: string
  shipmentName: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CancelDispatchDialog({
  shipmentId,
  shipmentName,
  open: controlledOpen,
  onOpenChange,
}: CancelDispatchDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/v1/dispatch/${shipmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel dispatch')
      }

      toast.success('Dispatch cancelled')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2">
            <XCircle className="h-4 w-4" />
            Cancel Dispatch
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Dispatch</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel{' '}
            <span className="font-medium text-foreground">
              {shipmentName || 'this dispatch'}
            </span>
            ? The labels will be released back to your inventory and the receiver&apos;s
            share link will be disabled. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Dispatch</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleCancel()
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Cancel Dispatch
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
