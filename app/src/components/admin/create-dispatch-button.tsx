'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateDispatchButtonProps {
  orderId: string
  orderShortId: string
  availableLabelCount: number
}

export function CreateDispatchButton({ orderId, orderShortId, availableLabelCount }: CreateDispatchButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(`Dispatch for Order ${orderShortId}`)
  const [labelCount, setLabelCount] = useState(availableLabelCount)

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setName(`Dispatch for Order ${orderShortId}`)
      setLabelCount(availableLabelCount)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (labelCount < 1) return
    setLoading(true)

    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, labelCount }),
      })

      if (res.ok) {
        toast.success(`Dispatch created for ${labelCount} label${labelCount > 1 ? 's' : ''}`)
        setOpen(false)
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create dispatch')
      }
    } catch (error) {
      console.error('Error creating dispatch:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (availableLabelCount === 0) return null

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-border text-foreground">
          <Send className="mr-1 h-3 w-3" />
          Dispatch
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Label Dispatch</DialogTitle>
          <DialogDescription>
            Create a dispatch for this order. Labels will be linked when you scan them at ship time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dispatch-name">Dispatch name</Label>
            <Input
              id="dispatch-name"
              placeholder="Dispatch name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-border bg-muted text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label-count">Number of labels</Label>
            <Input
              id="label-count"
              type="number"
              min={1}
              max={availableLabelCount}
              value={labelCount}
              onChange={(e) => setLabelCount(parseInt(e.target.value) || 0)}
              className="border-border bg-muted text-foreground font-mono"
              required
            />
            <p className="text-xs text-muted-foreground">
              {availableLabelCount} label{availableLabelCount !== 1 ? 's' : ''} available in this order
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || labelCount < 1 || labelCount > availableLabelCount}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Dispatch ({labelCount} label{labelCount !== 1 ? 's' : ''})
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
