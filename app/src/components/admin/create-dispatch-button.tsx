'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { HelpCircle, Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { countries } from '@/lib/constants/countries'

const adminDispatchSchema = z.object({
  name: z.string().min(1, 'Dispatch name is required').max(200),
  labelCount: z.number().int().min(1),
  askReceiver: z.boolean().default(true),
  receiverFirstName: z.string().max(100).optional().or(z.literal('')),
  receiverLastName: z.string().max(100).optional().or(z.literal('')),
  receiverEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  receiverPhone: z.string().max(30).optional().or(z.literal('')),
  destinationLine1: z.string().max(300).optional().or(z.literal('')),
  destinationLine2: z.string().max(300).optional().or(z.literal('')),
  destinationCity: z.string().max(100).optional().or(z.literal('')),
  destinationState: z.string().max(100).optional().or(z.literal('')),
  destinationPostalCode: z.string().max(20).optional().or(z.literal('')),
  destinationCountry: z.string().length(2).optional().or(z.literal('')),
})

type AdminDispatchForm = z.infer<typeof adminDispatchSchema>

interface CreateDispatchButtonProps {
  orderId: string
  orderShortId: string
  availableLabelCount: number
}

export function CreateDispatchButton({ orderId, orderShortId, availableLabelCount }: CreateDispatchButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdminDispatchForm>({
    resolver: zodResolver(adminDispatchSchema),
    defaultValues: {
      name: `Dispatch for Order ${orderShortId}`,
      labelCount: availableLabelCount,
      askReceiver: true,
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

  const askReceiver = watch('askReceiver')
  const country = watch('destinationCountry')

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      reset({
        name: `Dispatch for Order ${orderShortId}`,
        labelCount: availableLabelCount,
        askReceiver: true,
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
      })
    }
  }

  const onSubmit = async (data: AdminDispatchForm) => {
    // Validate required address fields when admin chose to fill them
    if (!data.askReceiver) {
      const missing: string[] = []
      if (!data.receiverFirstName?.trim()) missing.push('First Name')
      if (!data.receiverLastName?.trim()) missing.push('Last Name')
      if (!data.receiverEmail?.trim()) missing.push('Email')
      if (!data.destinationLine1?.trim()) missing.push('Address Line 1')
      if (!data.destinationCity?.trim()) missing.push('City')
      if (!data.destinationPostalCode?.trim()) missing.push('Postal Code')
      if (!data.destinationCountry?.trim()) missing.push('Country')
      if (missing.length > 0) {
        toast.error(`Please fill in: ${missing.join(', ')}`)
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          labelCount: data.labelCount,
          askReceiver: data.askReceiver,
          ...(data.askReceiver ? {} : {
            receiverFirstName: data.receiverFirstName,
            receiverLastName: data.receiverLastName,
            receiverEmail: data.receiverEmail,
            receiverPhone: data.receiverPhone,
            destinationLine1: data.destinationLine1,
            destinationLine2: data.destinationLine2,
            destinationCity: data.destinationCity,
            destinationState: data.destinationState,
            destinationPostalCode: data.destinationPostalCode,
            destinationCountry: data.destinationCountry,
          }),
        }),
      })

      if (res.ok) {
        const result = await res.json()
        if (result.shareLink) {
          const fullLink = `${window.location.origin}${result.shareLink}`
          await navigator.clipboard.writeText(fullLink).catch(() => {})
          toast.success(`Dispatch created. Share link copied to clipboard.`, {
            description: fullLink,
            duration: 8000,
          })
        } else {
          toast.success(`Dispatch created for ${data.labelCount} label${data.labelCount > 1 ? 's' : ''}`)
        }
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
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Label Dispatch</DialogTitle>
          <DialogDescription>
            Create a dispatch for this order. Labels will be linked when you scan them at ship time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Dispatch Details */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dispatch-name">Dispatch name</Label>
              <Input
                id="dispatch-name"
                placeholder="Dispatch name"
                {...register('name')}
                className="border-border bg-muted text-foreground"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="label-count">Number of labels</Label>
              <Input
                id="label-count"
                type="number"
                min={1}
                max={availableLabelCount}
                {...register('labelCount', { valueAsNumber: true })}
                className="border-border bg-muted text-foreground font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {availableLabelCount} label{availableLabelCount !== 1 ? 's' : ''} available in this order
              </p>
            </div>
          </div>

          {/* Receiver Section */}
          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground">Receiver Details</h4>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent/50 cursor-pointer">
              <input
                type="checkbox"
                checked={askReceiver}
                onChange={(e) => setValue('askReceiver', e.target.checked)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  I don&apos;t know these details yet — ask the receiver
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  A share link will be generated so the receiver can fill in their own address.
                </p>
              </div>
            </label>

            {!askReceiver && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="receiver-first">First Name</Label>
                    <Input id="receiver-first" placeholder="Jane" {...register('receiverFirstName')} className="border-border bg-muted text-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="receiver-last">Last Name</Label>
                    <Input id="receiver-last" placeholder="Doe" {...register('receiverLastName')} className="border-border bg-muted text-foreground" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="receiver-email">Email</Label>
                    <Input id="receiver-email" type="email" placeholder="jane@acme.com" {...register('receiverEmail')} className="border-border bg-muted text-foreground" />
                    {errors.receiverEmail && <p className="text-sm text-destructive">{errors.receiverEmail.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="receiver-phone">Phone (optional)</Label>
                    <Input id="receiver-phone" type="tel" placeholder="+44 7700 900000" {...register('receiverPhone')} className="border-border bg-muted text-foreground" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dest-line1">Address Line 1</Label>
                  <Input id="dest-line1" placeholder="123 Main St" {...register('destinationLine1')} className="border-border bg-muted text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dest-line2">Address Line 2 (optional)</Label>
                  <Input id="dest-line2" placeholder="Suite 200" {...register('destinationLine2')} className="border-border bg-muted text-foreground" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-city">City</Label>
                    <Input id="dest-city" placeholder="Berlin" {...register('destinationCity')} className="border-border bg-muted text-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-state">State / Region</Label>
                    <Input id="dest-state" placeholder="" {...register('destinationState')} className="border-border bg-muted text-foreground" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-postal">Postal Code</Label>
                    <Input id="dest-postal" placeholder="10115" {...register('destinationPostalCode')} className="border-border bg-muted text-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-country">Country</Label>
                    <Select
                      value={country || ''}
                      onValueChange={(v) => setValue('destinationCountry', v)}
                    >
                      <SelectTrigger id="dest-country" className="border-border bg-muted text-foreground">
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
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Dispatch ({watch('labelCount')} label{watch('labelCount') !== 1 ? 's' : ''})
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
