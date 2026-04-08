'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AddressInput } from '@/components/ui/address-input'
import { FieldInfo } from '@/components/ui/field-info'

interface EditDispatchDialogProps {
  shipmentId: string
  currentName: string | null
  currentDestination: string | null
}

export function EditDispatchDialog({
  shipmentId,
  currentName,
  currentDestination,
}: EditDispatchDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(currentName || '')
  const [destination, setDestination] = useState(currentDestination || '')
  const [destLat, setDestLat] = useState<number | null>(null)
  const [destLng, setDestLng] = useState<number | null>(null)
  const router = useRouter()

  function handleAddressSelect(address: string, lat: number, lng: number) {
    setDestination(address)
    setDestLat(lat)
    setDestLng(lng)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsLoading(true)

    try {
      const body: Record<string, unknown> = {}
      if (name !== currentName) body.name = name
      if (destination !== currentDestination) {
        body.destinationAddress = destination
        if (destLat != null && destLng != null) {
          body.destinationLat = destLat
          body.destinationLng = destLng
        }
      }

      if (Object.keys(body).length === 0) {
        setOpen(false)
        return
      }

      const response = await fetch(`/api/v1/dispatch/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update dispatch')
      }

      toast.success('Dispatch updated')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Dispatch</DialogTitle>
          <DialogDescription>
            Update the dispatch name or the receiver&apos;s delivery address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-dispatch-name">Dispatch Name</Label>
            <Input
              id="edit-dispatch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Warehouse labels — Batch 1"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="edit-dispatch-destination">Receiver Address</Label>
              <FieldInfo text="Where TIP should ship the labels. Select an address from suggestions to update the map pin location." />
            </div>
            <AddressInput
              id="edit-dispatch-destination"
              defaultValue={currentDestination || ''}
              placeholder="Search for an address..."
              disabled={isLoading}
              onAddressSelect={handleAddressSelect}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
