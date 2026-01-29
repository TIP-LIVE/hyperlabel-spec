'use client'

import { useState, useEffect } from 'react'
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
import { Loader2, Package } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Shipment name is required').max(200),
  labelId: z.string().min(1, 'Please select a label'),
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

  // Simple geocoding placeholder - in production use Google Places API
  const handleAddressChange = (address: string) => {
    setValue('destinationAddress', address)
    // Placeholder coordinates - would use real geocoding API
    if (address.length > 5) {
      setValue('destinationLat', 51.5074) // London default
      setValue('destinationLng', -0.1278)
    }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      const res = await fetch('/api/v1/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const { shipment } = await res.json()
        toast.success('Shipment created successfully!')
        router.push(`/shipments/${shipment.id}`)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create shipment')
      }
    } catch (error) {
      console.error('Error creating shipment:', error)
      toast.error('Something went wrong. Please try again.')
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

      {/* Destination */}
      <div className="space-y-2">
        <Label htmlFor="destination">Destination Address</Label>
        <Input
          id="destination"
          placeholder="e.g., 123 Main St, Berlin, Germany"
          onChange={(e) => handleAddressChange(e.target.value)}
        />
        {errors.destinationAddress && (
          <p className="text-sm text-destructive">{errors.destinationAddress.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Used for delivery detection. Enter the full address of the destination.
        </p>
      </div>

      {/* Hidden coordinate fields */}
      <input type="hidden" {...register('destinationLat', { valueAsNumber: true })} />
      <input type="hidden" {...register('destinationLng', { valueAsNumber: true })} />

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || labels.length === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Shipment
        </Button>
      </div>
    </form>
  )
}
