'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Navigation, Send } from 'lucide-react'
import { FieldInfo } from '@/components/ui/field-info'
import { SectionCard } from '@/components/ui/section-card'
import { AddressInput } from '@/components/ui/address-input'
import { MultiLabelSelector } from '@/components/shipments/multi-label-selector'

const dispatchFormSchema = z.object({
  name: z.string().min(1, 'Dispatch name is required').max(200),
  originAddress: z.string().default(''),
  originLat: z.number().min(-90).max(90).nullable().optional(),
  originLng: z.number().min(-180).max(180).nullable().optional(),
  destinationAddress: z.string().default(''),
  destinationLat: z.number().min(-90).max(90).nullable().optional(),
  destinationLng: z.number().min(-180).max(180).nullable().optional(),
})

type DispatchFormData = {
  name: string
  originAddress: string
  originLat: number | null
  originLng: number | null
  destinationAddress: string
  destinationLat: number | null
  destinationLng: number | null
}

export function CreateDispatchForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchFormSchema) as Resolver<DispatchFormData>,
    defaultValues: {
      name: '',
      originAddress: '',
      originLat: null,
      originLng: null,
      destinationAddress: '',
      destinationLat: null,
      destinationLng: null,
    },
  })

  const handleOriginSelect = useCallback(
    (address: string, lat: number, lng: number) => {
      setValue('originAddress', address)
      setValue('originLat', lat && lng ? lat : null)
      setValue('originLng', lat && lng ? lng : null)
    },
    [setValue]
  )

  const handleDestinationSelect = useCallback(
    (address: string, lat: number, lng: number) => {
      setValue('destinationAddress', address)
      setValue('destinationLat', lat && lng ? lat : null)
      setValue('destinationLng', lat && lng ? lng : null)
    },
    [setValue]
  )

  const onSubmit = async (data: DispatchFormData) => {
    if (selectedLabelIds.length === 0) {
      toast.error('Please select at least one label to dispatch')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/v1/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          labelIds: selectedLabelIds,
        }),
      })

      if (res.ok) {
        const { shipment } = await res.json()
        toast.success('Label dispatch created successfully!')
        router.push(`/dispatch/${shipment.id}`)
      } else {
        let errorMessage = 'Failed to create dispatch'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = res.statusText || errorMessage
        }
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error creating dispatch:', error)
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Dispatch Details */}
      <SectionCard icon={Send} title="Dispatch Details">
        {/* Dispatch Name */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="dispatch-name">Dispatch Name</Label>
            <FieldInfo text="A name to identify this label dispatch on your dashboard." />
          </div>
          <Input
            id="dispatch-name"
            placeholder="e.g., Labels for Berlin Warehouse"
            {...register('name')}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        {/* Multi-Label Selector */}
        <div className="space-y-1.5">
          <Label>Labels to Dispatch</Label>
          <MultiLabelSelector
            selectedIds={selectedLabelIds}
            onChange={setSelectedLabelIds}
          />
        </div>
      </SectionCard>

      {/* Route Details */}
      <SectionCard icon={Navigation} title="Route Details" badge="Optional">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="origin">Origin Address</Label>
            <FieldInfo text="Starting point for route tracking. Start typing for suggestions." />
          </div>
          <AddressInput
            id="origin"
            placeholder="e.g., 45 Warehouse Rd, London, UK"
            onAddressSelect={handleOriginSelect}
          />
          {errors.originAddress && (
            <p className="text-sm text-destructive">{errors.originAddress.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="destination">Destination Address</Label>
            <FieldInfo text="Destination for route tracking and delivery detection." />
          </div>
          <AddressInput
            id="destination"
            placeholder="e.g., 123 Main St, Berlin, Germany"
            onAddressSelect={handleDestinationSelect}
          />
          {errors.destinationAddress && (
            <p className="text-sm text-destructive">{errors.destinationAddress.message}</p>
          )}
        </div>
      </SectionCard>

      {/* Submit */}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
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
          disabled={loading || selectedLabelIds.length === 0}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {selectedLabelIds.length > 0
            ? `Create Dispatch (${selectedLabelIds.length} label${selectedLabelIds.length !== 1 ? 's' : ''})`
            : 'Create Dispatch'}
        </Button>
      </div>
    </form>
  )
}
