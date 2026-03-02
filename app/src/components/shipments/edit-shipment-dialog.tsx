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

interface EditShipmentDialogProps {
  shipmentId: string
  currentName: string | null
  currentOrigin: string | null
  currentDestination: string | null
}

export function EditShipmentDialog({
  shipmentId,
  currentName,
  currentOrigin,
  currentDestination,
}: EditShipmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(currentName || '')
  const [origin, setOrigin] = useState(currentOrigin || '')
  const [originLat, setOriginLat] = useState<number>(0)
  const [originLng, setOriginLng] = useState<number>(0)
  const [destination, setDestination] = useState(currentDestination || '')
  const [destLat, setDestLat] = useState<number>(0)
  const [destLng, setDestLng] = useState<number>(0)
  const router = useRouter()

  function handleOriginSelect(address: string, lat: number, lng: number) {
    setOrigin(address)
    setOriginLat(lat)
    setOriginLng(lng)
  }

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
      const body: Record<string, string | number> = {}
      if (name !== currentName) body.name = name
      if (origin !== currentOrigin) {
        body.originAddress = origin
        if (originLat !== 0 && originLng !== 0) {
          body.originLat = originLat
          body.originLng = originLng
        }
      }
      if (destination !== currentDestination) {
        body.destinationAddress = destination
        if (destLat !== 0 && destLng !== 0) {
          body.destinationLat = destLat
          body.destinationLng = destLng
        }
      }

      if (Object.keys(body).length === 0) {
        setOpen(false)
        return
      }

      const response = await fetch(`/api/v1/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update shipment')
      }

      toast.success('Shipment updated')
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Shipment</DialogTitle>
          <DialogDescription>
            Update the shipment name, origin, or destination address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Cargo Name / ID</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Electronics — INV-2024-001"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-origin">Origin Address</Label>
            <AddressInput
              id="edit-origin"
              defaultValue={currentOrigin || ''}
              placeholder="Search for an address..."
              disabled={isLoading}
              onAddressSelect={handleOriginSelect}
            />
            <p className="text-xs text-muted-foreground">
              Where the cargo is being shipped from.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-destination">Destination Address</Label>
            <AddressInput
              id="edit-destination"
              defaultValue={currentDestination || ''}
              placeholder="Search for an address..."
              disabled={isLoading}
              onAddressSelect={handleAddressSelect}
            />
            <p className="text-xs text-muted-foreground">
              Select an address from suggestions to update the map pin location.
            </p>
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
