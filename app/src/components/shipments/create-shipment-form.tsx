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
import {
  Loader2,
  Package,
  Navigation,
  Camera,
  X,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import { AddressInput } from '@/components/ui/address-input'
import { QrScanner } from '@/components/shipments/qr-scanner'

const formSchema = z.object({
  name: z.string().min(1, 'Shipment name is required').max(200),
  labelId: z.string().min(1, 'Please select a label'),
  originAddress: z.string().optional().default(''),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destinationAddress: z.string().optional().default(''),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  consigneeEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
})

type FormData = z.infer<typeof formSchema>

type AvailableLabel = {
  id: string
  deviceId: string
  batteryPct: number | null
}

type PhotoState = {
  file: File
  preview: string
  uploadedUrl?: string
  uploading?: boolean
  analysis?: CargoAnalysis | null
  analyzing?: boolean
}

type CargoAnalysis = {
  labelVisible: boolean
  labelAttachmentQuality: 'good' | 'poor' | 'not_visible'
  cargoType: string | null
  packageCount: number | null
  existingLabels: string[]
  hazardWarnings: string[]
  cargoCondition: 'good' | 'damaged' | 'unknown'
  confidence: number
  summary: string
}

export function CreateShipmentForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [labels, setLabels] = useState<AvailableLabel[]>([])
  const [labelsLoading, setLabelsLoading] = useState(true)
  const [photos, setPhotos] = useState<PhotoState[]>([])
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
      consigneeEmail: '',
    },
  })

  const selectedLabelId = watch('labelId')

  // Handle QR scanner result — find matching label and select it
  const handleQrScanned = useCallback(
    (deviceId: string) => {
      const matchingLabel = labels.find(
        (l) => l.deviceId.toUpperCase() === deviceId.toUpperCase()
      )
      if (matchingLabel) {
        setValue('labelId', matchingLabel.id)
      } else {
        toast.error(
          `Label ${deviceId} not found in your available labels. Make sure the label has been purchased and delivered.`
        )
      }
    },
    [labels, setValue]
  )

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
  const handleOriginSelect = useCallback(
    (address: string, lat: number, lng: number) => {
      setValue('originAddress', address)
      if (lat !== 0 && lng !== 0) {
        setValue('originLat', lat)
        setValue('originLng', lng)
      }
    },
    [setValue]
  )

  const handleDestinationSelect = useCallback(
    (address: string, lat: number, lng: number) => {
      setValue('destinationAddress', address)
      if (lat !== 0 && lng !== 0) {
        setValue('destinationLat', lat)
        setValue('destinationLng', lng)
      }
    },
    [setValue]
  )

  // Upload a photo to Vercel Blob storage
  const uploadPhoto = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        return data.url
      }
      // If upload service not available, fall back to base64
      return null
    } catch {
      return null
    }
  }, [])

  // Analyze a photo with AI
  const analyzePhoto = useCallback(async (file: File): Promise<CargoAnalysis | null> => {
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/v1/ai/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mimeType: file.type }),
      })

      if (res.ok) {
        const data = await res.json()
        return data.analysis
      }
      return null
    } catch {
      return null
    }
  }, [])

  // Photo upload handlers — upload + analyze in parallel
  const handlePhotoSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      const newPhotos: PhotoState[] = Array.from(files)
        .slice(0, 5 - photos.length)
        .map((file) => ({
          file,
          preview: URL.createObjectURL(file),
          uploading: true,
          analyzing: true,
        }))

      const startIndex = photos.length
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5))

      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Process each photo: upload + AI analysis in parallel
      for (let i = 0; i < newPhotos.length; i++) {
        const photoIndex = startIndex + i
        const file = newPhotos[i].file

        // Run upload and analysis concurrently
        const [uploadedUrl, analysis] = await Promise.all([
          uploadPhoto(file),
          analyzePhoto(file),
        ])

        setPhotos((prev) => {
          const updated = [...prev]
          if (updated[photoIndex]) {
            updated[photoIndex] = {
              ...updated[photoIndex],
              uploadedUrl: uploadedUrl || undefined,
              uploading: false,
              analysis,
              analyzing: false,
            }
          }
          return updated
        })

        // Show AI analysis toast
        if (analysis) {
          if (analysis.hazardWarnings.length > 0) {
            toast.warning(`Hazard detected: ${analysis.hazardWarnings.join(', ')}`)
          }
          if (analysis.cargoCondition === 'damaged') {
            toast.warning('AI detected possible cargo damage. Consider documenting this.')
          }
        }
      }
    },
    [photos.length, uploadPhoto, analyzePhoto]
  )

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
      // Collect photo URLs — use uploaded URLs or fall back to base64
      const photoUrls: string[] = []
      for (const photo of photos) {
        if (photo.uploadedUrl) {
          photoUrls.push(photo.uploadedUrl)
        } else {
          // Fallback: convert to base64 if upload failed/not available
          const reader = new FileReader()
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(photo.file)
          })
          photoUrls.push(dataUrl)
        }
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
        let errorMessage = 'Failed to create shipment'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
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

  // Get AI analysis summary for display
  const firstAnalysis = photos.find((p) => p.analysis)?.analysis

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Shipment Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Shipment Name</Label>
        <Input id="name" placeholder="e.g., Electronics to Berlin" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Label Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="labelId">Tracking Label</Label>
          {!labelsLoading && labels.length > 0 && (
            <QrScanner onDeviceIdScanned={handleQrScanned} />
          )}
        </div>
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
          <Label htmlFor="origin">Origin Address (optional)</Label>
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
          <Label htmlFor="destination">Destination Address (optional)</Label>
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

      {/* Consignee Email */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Mail className="h-4 w-4" />
          Notify Consignee
        </div>
        <div className="space-y-2">
          <Label htmlFor="consigneeEmail">Consignee Email</Label>
          <Input
            id="consigneeEmail"
            type="email"
            placeholder="receiver@example.com"
            {...register('consigneeEmail')}
          />
          {errors.consigneeEmail && (
            <p className="text-sm text-destructive">{errors.consigneeEmail.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Optional — we&apos;ll send them a real-time tracking link so they can follow the
            delivery.
          </p>
        </div>
      </div>

      {/* Cargo Photos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label>Cargo Photos</Label>
          <span className="text-xs text-muted-foreground">(optional, max 5)</span>
        </div>

        {/* Photo Previews */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="group relative h-20 w-20 overflow-hidden rounded-lg border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={`Cargo photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {/* Uploading/analyzing overlay */}
                {(photo.uploading || photo.analyzing) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
                {/* Analysis status indicator */}
                {!photo.analyzing && photo.analysis && (
                  <div className="absolute bottom-0.5 left-0.5">
                    {photo.analysis.labelVisible ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/90">
                        <Eye className="h-3 w-3 text-white" />
                      </div>
                    ) : photo.analysis.hazardWarnings.length > 0 ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/90">
                        <AlertTriangle className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/90">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                )}
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

        {/* AI Analysis Summary Card */}
        {firstAnalysis && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Analysis
            </div>
            <p className="mt-1 text-muted-foreground">{firstAnalysis.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {firstAnalysis.cargoType && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {firstAnalysis.cargoType}
                </span>
              )}
              {firstAnalysis.packageCount && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {firstAnalysis.packageCount} package{firstAnalysis.packageCount > 1 ? 's' : ''}
                </span>
              )}
              {firstAnalysis.labelVisible && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Label visible
                </span>
              )}
              {firstAnalysis.hazardWarnings.map((warning, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {warning}
                </span>
              ))}
              {firstAnalysis.cargoCondition === 'damaged' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Possible damage
                </span>
              )}
            </div>
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
          capture="environment"
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <p className="text-xs text-muted-foreground">
          Document your cargo before shipping. AI will automatically analyze the photo for cargo
          type, label visibility, and hazards.
        </p>
      </div>

      {/* Submit */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={loading || labels.length === 0}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Shipment
        </Button>
      </div>
    </form>
  )
}
