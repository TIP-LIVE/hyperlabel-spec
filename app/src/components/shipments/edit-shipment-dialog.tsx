'use client'

import { useState, useRef, useCallback } from 'react'
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
import { Loader2, Pencil, Camera, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AddressInput } from '@/components/ui/address-input'
import { FieldInfo } from '@/components/ui/field-info'

type PhotoItem = {
  url: string
  isNew?: boolean
  file?: File
  uploading?: boolean
}

interface EditShipmentDialogProps {
  shipmentId: string
  currentName: string | null
  currentOrigin?: string | null
  currentDestination: string | null
  currentPhotoUrls?: string[]
  apiBasePath?: string
}

export function EditShipmentDialog({
  shipmentId,
  currentName,
  currentOrigin = null,
  currentDestination,
  currentPhotoUrls = [],
  apiBasePath = '/api/v1/cargo',
}: EditShipmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(currentName || '')
  const [origin, setOrigin] = useState(currentOrigin || '')
  const [originLat, setOriginLat] = useState<number | null>(null)
  const [originLng, setOriginLng] = useState<number | null>(null)
  const [destination, setDestination] = useState(currentDestination || '')
  const [destLat, setDestLat] = useState<number | null>(null)
  const [destLng, setDestLng] = useState<number | null>(null)
  const [photos, setPhotos] = useState<PhotoItem[]>(
    currentPhotoUrls.map((url) => ({ url }))
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        return data.url
      }
      return null
    } catch {
      return null
    }
  }, [])

  const handlePhotoSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      const remaining = 5 - photos.length
      if (remaining <= 0) {
        toast.error('Maximum 5 photos allowed')
        return
      }

      const newFiles = Array.from(files).slice(0, remaining)

      // Add placeholders with loading state
      const placeholders: PhotoItem[] = newFiles.map((file) => ({
        url: URL.createObjectURL(file),
        isNew: true,
        file,
        uploading: true,
      }))

      setPhotos((prev) => [...prev, ...placeholders])
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Upload each file
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i]
        const uploadedUrl = await uploadFile(file)

        setPhotos((prev) => {
          const updated = [...prev]
          const idx = prev.findIndex((p) => p.file === file)
          if (idx !== -1) {
            if (uploadedUrl) {
              updated[idx] = { url: uploadedUrl, isNew: true, uploading: false }
            } else {
              // Upload failed — remove the placeholder
              URL.revokeObjectURL(updated[idx].url)
              updated.splice(idx, 1)
              toast.error(`Failed to upload ${file.name}`)
            }
          }
          return updated
        })
      }
    },
    [photos.length, uploadFile]
  )

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const updated = [...prev]
      if (updated[index].isNew && updated[index].file) {
        URL.revokeObjectURL(updated[index].url)
      }
      updated.splice(index, 1)
      return updated
    })
  }, [])

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    // Wait for any pending uploads
    if (photos.some((p) => p.uploading)) {
      toast.error('Please wait for photos to finish uploading')
      return
    }

    setIsLoading(true)

    try {
      const body: Record<string, unknown> = {}
      if (name !== currentName) body.name = name
      if (origin !== currentOrigin) {
        body.originAddress = origin
        if (originLat != null && originLng != null) {
          body.originLat = originLat
          body.originLng = originLng
        }
      }
      if (destination !== currentDestination) {
        body.destinationAddress = destination
        if (destLat != null && destLng != null) {
          body.destinationLat = destLat
          body.destinationLng = destLng
        }
      }

      // Always send photoUrls if they changed
      const newPhotoUrls = photos.map((p) => p.url)
      const photosChanged =
        newPhotoUrls.length !== currentPhotoUrls.length ||
        newPhotoUrls.some((url, i) => url !== currentPhotoUrls[i])
      if (photosChanged) {
        body.photoUrls = newPhotoUrls
      }

      if (Object.keys(body).length === 0) {
        setOpen(false)
        return
      }

      const response = await fetch(`${apiBasePath}/${shipmentId}`, {
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Cargo</DialogTitle>
          <DialogDescription>
            Update cargo details, origin and destination, or photos.
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
            <div className="flex items-center gap-1.5">
              <Label htmlFor="edit-origin">Origin Address</Label>
              <FieldInfo text="Where the cargo is being shipped from." />
            </div>
            <AddressInput
              id="edit-origin"
              defaultValue={currentOrigin || ''}
              placeholder="Search for an address..."
              disabled={isLoading}
              onAddressSelect={handleOriginSelect}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="edit-destination">Destination Address</Label>
              <FieldInfo text="Select an address from suggestions to update the map pin location." />
            </div>
            <AddressInput
              id="edit-destination"
              defaultValue={currentDestination || ''}
              placeholder="Search for an address..."
              disabled={isLoading}
              onAddressSelect={handleAddressSelect}
            />
          </div>

          {/* Cargo Photos */}
          <div className="space-y-2">
            <Label>Cargo Photos</Label>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Cargo photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {photo.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      disabled={isLoading}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 5 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isLoading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {photos.length === 0 ? 'Add photos' : `Add more (${photos.length}/5)`}
                </Button>
              </div>
            )}
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
