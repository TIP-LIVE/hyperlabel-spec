'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Package, Navigation, Camera, X } from 'lucide-react'
import { AddressInput } from '@/components/ui/address-input'

const formSchema = z.object({
  name: z.string().min(1, 'Shipment name is required').max(200),
  labelId: z.string().min(1, 'Please select a label'),
  originAddress: z.string().min(1, 'Origin address is required'),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
})

type FormData = z.infer<typeof formSchema>

type AvailableLabel = {
  id: string
  deviceId: string
  batteryPct: number | null
}

export function CreateShipmentForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [labels, setLabels] = useState<AvailableLabel[]>([])
  const [labelsLoading, setLabelsLoading] = useState(true)
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      labelId: '',
      originAddress: '',
      originLat: 0,
      originLng: 0,
      destinationAddress: '',
      destinationLat: 0,
      destinationLng: 0,
    },
  })

  const selectedLabelId = watch('labelId')

  // Fetch available labels
  useEffect(() => {
    async function fetchLabels() {
      try {
        const res = await fetch('/api/v1/labels?status=SOLD')
        if (res.ok) {
          const data = await res.json()
          setLabels(data.labels || [])
        }
      } catch (error) {
        console.error('Failed to fetch labels:', error)
      } finally {
        setLabelsLoading(false)
      }
    }

    fetchLabels()
  }, [])

  // Address selection handlers
  const handleOriginSelect = useCallback((address: string, lat: number, lng: number) => {
    setValue('originAddress', address)
    if (lat !== 0 && lng !== 0) {
      setValue('originLat', lat)
      setValue('originLng', lng)
    }
  }, [setValue])

  const handleDestinationSelect = useCallback((address: string, lat: number, lng: number) => {
    setValue('destinationAddress', address)
    if (lat !== 0 && lng !== 0) {
      setValue('destinationLat', lat)
      setValue('destinationLng', lng)
    }
  }, [setValue])

  // Photo upload handlers
  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPhotos = Array.from(files).slice(0, 5 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5))
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [photos.length])

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }, [])

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      // Convert photos to base64 data URLs if any
      const photoUrls: string[] = []
      for (const photo of photos) {
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(photo.file)
        })
        photoUrls.push(dataUrl)
      }

      const res = await fetch('/api/v1/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, photoUrls }),
      })

      if (res.ok) {
        const { shipment } = await res.json()
        toast.success('Shipment created successfully!')
        router.push(`/shipments/${shipment.id}`)
      } else {
        // Safely parse error response
        let errorMessage = 'Failed to create shipment'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Response wasn't JSON
          errorMessage = res.statusText || errorMessage
        }
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error creating shipment:', error)
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Shipment Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Shipment Name</Label>
        <Input
          id="name"
          placeholder="e.g., Electronics to Berlin"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Label Selection */}
      <div className="space-y-2">
        <Label htmlFor="labelId">Tracking Label</Label>
        {labelsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading available labels...
          </div>
        ) : labels.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No available labels. Purchase labels first.
            </p>
            <Button variant="outline" className="mt-3" asChild>
              <a href="/buy">Buy Labels</a>
            </Button>
          </div>
        ) : (
          <Select
            value={selectedLabelId}
            onValueChange={(value) => setValue('labelId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a label" />
            </SelectTrigger>
            <SelectContent>
              {labels.map((label) => (
                <SelectItem key={label.id} value={label.id}>
                  {label.deviceId}
                  {label.batteryPct !== null && ` (${label.batteryPct}% battery)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.labelId && (
          <p className="text-sm text-destructive">{errors.labelId.message}</p>
        )}
      </div>

      {/* Origin & Destination Addresses */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Navigation className="h-4 w-4" />
          Route Details
        </div>

        {/* Origin */}
        <div className="space-y-2">
          <Label htmlFor="origin">Origin Address</Label>
          <AddressInput
            id="origin"
            placeholder="e.g., 45 Warehouse Rd, London, UK"
            onAddressSelect={handleOriginSelect}
          />
          {errors.originAddress && (
            <p className="text-sm text-destructive">{errors.originAddress.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Where the cargo is being shipped from. Start typing for suggestions.
          </p>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label htmlFor="destination">Destination Address</Label>
          <AddressInput
            id="destination"
            placeholder="e.g., 123 Main St, Berlin, Germany"
            onAddressSelect={handleDestinationSelect}
          />
          {errors.destinationAddress && (
            <p className="text-sm text-destructive">{errors.destinationAddress.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Where the cargo is going. Used for delivery detection.
          </p>
        </div>
      </div>

      {/* Hidden coordinate fields */}
      <input type="hidden" {...register('originLat', { valueAsNumber: true })} />
      <input type="hidden" {...register('originLng', { valueAsNumber: true })} />
      <input type="hidden" {...register('destinationLat', { valueAsNumber: true })} />
      <input type="hidden" {...register('destinationLng', { valueAsNumber: true })} />

      {/* Cargo Photos */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Cargo Photos</Label>
          <span className="text-xs text-muted-foreground">(optional, max 5)</span>
        </div>

        {/* Photo Previews */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={`Cargo photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-100 shadow-sm transition-opacity sm:right-1 sm:top-1 sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                >
                  <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {photos.length < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Camera className="h-5 w-5" />
            <span>
              {photos.length === 0
                ? 'Add photos of your cargo'
                : `Add more photos (${photos.length}/5)`}
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <p className="text-xs text-muted-foreground">
          Document your cargo before shipping. Helps with claims if needed.
        </p>
      </div>

      {/* Submit */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={loading || labels.length === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Shipment
        </Button>
      </div>
    </form>
  )
}
