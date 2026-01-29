'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MarkShippedButtonProps {
  orderId: string
}

export function MarkShippedButton({ orderId }: MarkShippedButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: trackingNumber || undefined }),
      })

      if (res.ok) {
        toast.success('Order marked as shipped')
        setOpen(false)
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update order')
      }
    } catch (error) {
      console.error('Error marking shipped:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
          <Truck className="mr-1 h-3 w-3" />
          Ship
        </Button>
      </DialogTrigger>
      <DialogContent className="border-gray-800 bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-white">Mark Order as Shipped</DialogTitle>
          <DialogDescription>
            Enter the shipping tracking number (optional)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Tracking number (e.g., 1Z999AA10123456784)"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="border-gray-700 bg-gray-800 text-white"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Shipped
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
