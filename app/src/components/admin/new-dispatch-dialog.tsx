'use client'

import { useEffect, useState } from 'react'
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
import { ChevronLeft, HelpCircle, Loader2, Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { countries } from '@/lib/constants/countries'

type DispatchableOrder = {
  id: string
  shortId: string
  userEmail: string
  orgId: string | null
  orgName: string | null
  quantity: number
  dispatched: number
  remaining: number
  createdAt: string
}

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

export function NewDispatchDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [orders, setOrders] = useState<DispatchableOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<DispatchableOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      name: '',
      labelCount: 1,
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
  const labelCount = watch('labelCount')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const run = async () => {
      setLoadingOrders(true)
      try {
        const qs = query ? `?q=${encodeURIComponent(query)}` : ''
        const res = await fetch(`/api/v1/admin/orders/dispatchable${qs}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setOrders(data.orders || [])
        } else if (!cancelled) {
          setOrders([])
        }
      } catch {
        if (!cancelled) setOrders([])
      } finally {
        if (!cancelled) setLoadingOrders(false)
      }
    }
    const timer = setTimeout(run, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, query])

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedOrder(null)
      setQuery('')
      reset()
    }
  }

  const handlePickOrder = (order: DispatchableOrder) => {
    setSelectedOrder(order)
    reset({
      name: `Dispatch for Order ${order.shortId}`,
      labelCount: order.remaining,
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

  const onSubmit = async (data: AdminDispatchForm) => {
    if (!selectedOrder) return

    if (data.labelCount > selectedOrder.remaining) {
      toast.error(`Label count exceeds remaining capacity (${selectedOrder.remaining})`)
      return
    }

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

    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/admin/orders/${selectedOrder.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          labelCount: data.labelCount,
          askReceiver: data.askReceiver,
          ...(data.askReceiver
            ? {}
            : {
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
          toast.success('Dispatch created. Share link copied to clipboard.', {
            description: fullLink,
            duration: 8000,
          })
        } else {
          toast.success(
            `Dispatch created for ${data.labelCount} label${data.labelCount > 1 ? 's' : ''}`,
          )
        }
        handleOpen(false)
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create dispatch')
      }
    } catch (error) {
      console.error('Error creating dispatch:', error)
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Dispatch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {selectedOrder ? 'Create Label Dispatch' : 'Pick an Order'}
          </DialogTitle>
          <DialogDescription>
            {selectedOrder
              ? `Order ${selectedOrder.shortId} — ${selectedOrder.remaining} label${selectedOrder.remaining !== 1 ? 's' : ''} available`
              : 'Select a paid order with remaining dispatch capacity.'}
          </DialogDescription>
        </DialogHeader>

        {!selectedOrder ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order ID or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-border bg-muted pl-9 text-foreground"
              />
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {query ? 'No matching orders' : 'No orders with remaining dispatch capacity'}
                </p>
              ) : (
                orders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handlePickOrder(o)}
                    className="w-full rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 truncate">
                        <p className="font-mono text-sm text-foreground">{o.shortId}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.userEmail}
                          {o.orgName ? ` · ${o.orgName}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {o.remaining} / {o.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">remaining</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3 w-3" />
              Change order
            </button>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="dispatch-name">Dispatch name</Label>
                <Input
                  id="dispatch-name"
                  placeholder="Dispatch name"
                  {...register('name')}
                  className="border-border bg-muted text-foreground"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="label-count">Number of labels</Label>
                <Input
                  id="label-count"
                  type="number"
                  min={1}
                  max={selectedOrder.remaining}
                  {...register('labelCount', { valueAsNumber: true })}
                  className="border-border bg-muted font-mono text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  {selectedOrder.remaining} label
                  {selectedOrder.remaining !== 1 ? 's' : ''} available in this order
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-medium text-foreground">Receiver Details</h4>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent/50">
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
                      <Input
                        id="receiver-first"
                        placeholder="Jane"
                        {...register('receiverFirstName')}
                        className="border-border bg-muted text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="receiver-last">Last Name</Label>
                      <Input
                        id="receiver-last"
                        placeholder="Doe"
                        {...register('receiverLastName')}
                        className="border-border bg-muted text-foreground"
                      />
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
                        className="border-border bg-muted text-foreground"
                      />
                      {errors.receiverEmail && (
                        <p className="text-sm text-destructive">
                          {errors.receiverEmail.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="receiver-phone">Phone (optional)</Label>
                      <Input
                        id="receiver-phone"
                        type="tel"
                        placeholder="+44 7700 900000"
                        {...register('receiverPhone')}
                        className="border-border bg-muted text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dest-line1">Address Line 1</Label>
                    <Input
                      id="dest-line1"
                      placeholder="123 Main St"
                      {...register('destinationLine1')}
                      className="border-border bg-muted text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dest-line2">Address Line 2 (optional)</Label>
                    <Input
                      id="dest-line2"
                      placeholder="Suite 200"
                      {...register('destinationLine2')}
                      className="border-border bg-muted text-foreground"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="dest-city">City</Label>
                      <Input
                        id="dest-city"
                        placeholder="Berlin"
                        {...register('destinationCity')}
                        className="border-border bg-muted text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dest-state">State / Region</Label>
                      <Input
                        id="dest-state"
                        placeholder=""
                        {...register('destinationState')}
                        className="border-border bg-muted text-foreground"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="dest-postal">Postal Code</Label>
                      <Input
                        id="dest-postal"
                        placeholder="10115"
                        {...register('destinationPostalCode')}
                        className="border-border bg-muted text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dest-country">Country</Label>
                      <Select
                        value={country || ''}
                        onValueChange={(v) => setValue('destinationCountry', v)}
                      >
                        <SelectTrigger
                          id="dest-country"
                          className="border-border bg-muted text-foreground"
                        >
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

            <div className="flex gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpen(false)}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Dispatch ({labelCount} label{labelCount !== 1 ? 's' : ''})
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
