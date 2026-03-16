'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Send, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LabelInfo {
  id: string
  deviceId: string
  status: string
  inActiveDispatch: boolean
  dispatchStatus?: string
}

interface CreateDispatchButtonProps {
  orderId: string
  orderShortId: string
  labels: LabelInfo[]
}

export function CreateDispatchButton({ orderId, orderShortId, labels }: CreateDispatchButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(`Dispatch for Order ${orderShortId}`)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const availableLabels = labels.filter((l) => !l.inActiveDispatch && (l.status === 'SOLD' || l.status === 'INVENTORY'))
  const hasAvailable = availableLabels.length > 0

  const toggleLabel = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === availableLabels.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(availableLabels.map((l) => l.id)))
    }
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setName(`Dispatch for Order ${orderShortId}`)
      setSelectedIds(new Set(availableLabels.map((l) => l.id)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.size === 0) return
    setLoading(true)

    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, labelIds: Array.from(selectedIds) }),
      })

      if (res.ok) {
        toast.success(`Dispatch created with ${selectedIds.size} label${selectedIds.size > 1 ? 's' : ''}`)
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

  if (!hasAvailable) return null

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
            Select labels to include in this dispatch ({availableLabels.length} available)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Dispatch name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-border bg-muted text-foreground"
            required
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Labels</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                className="h-auto px-2 py-1 text-xs text-muted-foreground"
              >
                {selectedIds.size === availableLabels.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
            <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {labels.map((label) => {
                const isAvailable = !label.inActiveDispatch && (label.status === 'SOLD' || label.status === 'INVENTORY')
                return (
                  <label
                    key={label.id}
                    className={`flex items-center gap-3 rounded px-2 py-1.5 ${
                      isAvailable ? 'cursor-pointer hover:bg-muted' : 'opacity-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedIds.has(label.id)}
                      onCheckedChange={() => toggleLabel(label.id)}
                      disabled={!isAvailable}
                    />
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-sm text-foreground">{label.deviceId}</span>
                    {label.inActiveDispatch && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {label.dispatchStatus === 'IN_TRANSIT' ? 'In Transit' : 'Dispatched'}
                      </Badge>
                    )}
                    {!label.inActiveDispatch && label.status !== 'SOLD' && label.status !== 'INVENTORY' && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {label.status}
                      </Badge>
                    )}
                  </label>
                )
              })}
            </div>
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
            <Button type="submit" disabled={loading || selectedIds.size === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Dispatch ({selectedIds.size} label{selectedIds.size !== 1 ? 's' : ''})
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
