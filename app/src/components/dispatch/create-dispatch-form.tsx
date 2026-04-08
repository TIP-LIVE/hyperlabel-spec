'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Send, UserRound, HelpCircle } from 'lucide-react'
import { FieldInfo } from '@/components/ui/field-info'
import { SectionCard } from '@/components/ui/section-card'
import { LabelSelectionTable } from '@/components/dispatch/label-selection-table'
import { ShareReceiverLinkModal } from '@/components/dispatch/share-receiver-link-modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { countries } from '@/lib/constants/countries'

const dispatchFormSchema = z.object({
  name: z.string().min(1, 'Dispatch name is required').max(200),
  destinationAddress: z.string().default(''),
  destinationLat: z.number().min(-90).max(90).nullable().optional(),
  destinationLng: z.number().min(-180).max(180).nullable().optional(),
  receiverFirstName: z.string().max(100).optional().or(z.literal('')),
  receiverLastName: z.string().max(100).optional().or(z.literal('')),
  receiverEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  receiverPhone: z.string().max(30).optional().or(z.literal('')),
  destinationLine1: z.string().max(300).optional().or(z.literal('')),
  destinationLine2: z.string().max(300).optional().or(z.literal('')),
  destinationCity: z.string().max(100).optional().or(z.literal('')),
  destinationState: z.string().max(100).optional().or(z.literal('')),
  destinationPostalCode: z.string().max(20).optional().or(z.literal('')),
  destinationCountry: z.string().length(2).optional().or(z.literal('')),
})

type DispatchFormData = z.infer<typeof dispatchFormSchema>

export function CreateDispatchForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [askReceiver, setAskReceiver] = useState(false)
  const [shareModal, setShareModal] = useState<{
    shipmentId: string
    shareLink: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchFormSchema) as Resolver<DispatchFormData>,
    defaultValues: {
      name: '',
      destinationAddress: '',
      destinationLat: null,
      destinationLng: null,
      receiverFirstName: '',
      receiverLastName: '',
      receiverEmail: '',
      receiverPhone: '',
      destinationLine1: '',
      destinationLine2: '',
      destinationCity: '',
      destinationState: '',
      destinationPostalCode: '',
      destinationCountry: '',
    },
  })

  const country = watch('destinationCountry')

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
          askReceiver,
        }),
      })

      if (res.ok) {
        const payload = await res.json()
        const shipment = payload.shipment
        if (payload.awaitingReceiverDetails && payload.shareLink) {
          // Show the share modal instead of redirecting immediately
          setShareModal({
            shipmentId: shipment.id,
            shareLink: new URL(payload.shareLink, window.location.origin).toString(),
          })
          toast.success('Dispatch created. Share the link with your receiver.')
        } else {
          toast.success('Label dispatch created successfully!')
          router.push(`/dispatch/${shipment.id}`)
        }
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
    <>
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

          {/* Labels selection table */}
          <div className="space-y-1.5">
            <Label>Labels to Dispatch</Label>
            <LabelSelectionTable
              selectedIds={selectedLabelIds}
              onChange={setSelectedLabelIds}
            />
          </div>
        </SectionCard>

        {/* Receiver */}
        <SectionCard icon={UserRound} title="Receiver">
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm hover:bg-accent/50 cursor-pointer">
            <input
              type="checkbox"
              checked={askReceiver}
              onChange={(e) => setAskReceiver(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-medium">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                I don&apos;t know these details yet — I&apos;ll ask the receiver
              </div>
              <p className="mt-0.5 text-muted-foreground">
                We&apos;ll generate a share link you can send to the receiver so they can fill in
                their own address. The dispatch ships once they complete it.
              </p>
            </div>
          </label>

          {!askReceiver && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="receiver-first">First Name</Label>
                  <Input id="receiver-first" placeholder="Jane" {...register('receiverFirstName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="receiver-last">Last Name</Label>
                  <Input id="receiver-last" placeholder="Doe" {...register('receiverLastName')} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="receiver-email">Email</Label>
                  <Input
                    id="receiver-email"
                    type="email"
                    placeholder="jane@acme.com"
                    {...register('receiverEmail')}
                  />
                  {errors.receiverEmail && (
                    <p className="text-sm text-destructive">{errors.receiverEmail.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="receiver-phone">Phone (optional)</Label>
                  <Input
                    id="receiver-phone"
                    type="tel"
                    placeholder="+44 7700 900000"
                    {...register('receiverPhone')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dest-line1">Address Line 1</Label>
                <Input id="dest-line1" placeholder="123 Main St" {...register('destinationLine1')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dest-line2">Address Line 2 (optional)</Label>
                <Input id="dest-line2" placeholder="Suite 200" {...register('destinationLine2')} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dest-city">City</Label>
                  <Input id="dest-city" placeholder="Berlin" {...register('destinationCity')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dest-state">State / Region</Label>
                  <Input id="dest-state" placeholder="" {...register('destinationState')} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dest-postal">Postal Code</Label>
                  <Input id="dest-postal" placeholder="10115" {...register('destinationPostalCode')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dest-country">Country</Label>
                  <Select
                    value={country || ''}
                    onValueChange={(v) => setValue('destinationCountry', v)}
                  >
                    <SelectTrigger id="dest-country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
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
            {askReceiver
              ? 'Create & Get Share Link'
              : selectedLabelIds.length > 0
                ? `Create Dispatch (${selectedLabelIds.length} label${selectedLabelIds.length !== 1 ? 's' : ''})`
                : 'Create Dispatch'}
          </Button>
        </div>
      </form>

      {shareModal && (
        <ShareReceiverLinkModal
          shipmentId={shareModal.shipmentId}
          shareLink={shareModal.shareLink}
          onClose={() => {
            setShareModal(null)
            router.push(`/dispatch/${shareModal.shipmentId}`)
          }}
        />
      )}
    </>
  )
}
