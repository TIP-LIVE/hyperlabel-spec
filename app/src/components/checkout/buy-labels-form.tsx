'use client'

import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SavedAddressSelector } from '@/components/checkout/saved-address-selector'
import { toast } from 'sonner'
import { Loader2, CreditCard, Check, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { countries } from '@/lib/constants/countries'

const formSchema = z.object({
  packType: z.enum(['starter', 'team', 'volume']),
  shippingAddress: z.object({
    name: z.string().min(1, 'Name is required'),
    line1: z.string().min(1, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().length(2, 'Select a country'),
  }),
})

type FormData = z.infer<typeof formSchema>

const packs = [
  {
    key: 'starter' as const,
    name: '1 Label',
    labels: 1,
    price: 25,
    perLabel: 25,
    description: 'Single label',
    features: ['Full tracking & map', 'Shareable link', '60+ day battery'],
  },
  {
    key: 'team' as const,
    name: '5 Labels',
    labels: 5,
    price: 110,
    perLabel: 22,
    description: '$22 per label',
    popular: true,
    features: ['Same features as single', 'Save $15 vs buying one by one'],
  },
  {
    key: 'volume' as const,
    name: '10 Labels',
    labels: 10,
    price: 200,
    perLabel: 20,
    description: '$20 per label — lowest price',
    features: ['Same features as single', 'Save $50 vs buying one by one'],
  },
]

export function BuyLabelsForm() {
  const [loading, setLoading] = useState(false)
  const [saveAddress, setSaveAddress] = useState(false)
  const [addressLabel, setAddressLabel] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packType: 'team',
      shippingAddress: {
        name: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'GB',
      },
    },
  })

  const selectedPack = watch('packType')
  const selectedCountry = watch('shippingAddress.country')
  const currentPack = packs.find((p) => p.key === selectedPack)!

  const fillAddress = useCallback(
    (addr: { name: string; line1: string; line2: string; city: string; state: string; postalCode: string; country: string }) => {
      setValue('shippingAddress.name', addr.name)
      setValue('shippingAddress.line1', addr.line1)
      setValue('shippingAddress.line2', addr.line2)
      setValue('shippingAddress.city', addr.city)
      setValue('shippingAddress.state', addr.state)
      setValue('shippingAddress.postalCode', addr.postalCode)
      setValue('shippingAddress.country', addr.country)
    },
    [setValue]
  )

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      const res = await fetch('/api/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const { url } = await res.json()
        if (url) {
          // Save address to address book (best-effort, don't block redirect)
          if (saveAddress && addressLabel.trim()) {
            fetch('/api/v1/addresses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                label: addressLabel.trim(),
                ...data.shippingAddress,
              }),
            }).catch(() => {})
          }
          window.location.href = url
        } else {
          toast.error('Failed to create checkout session')
        }
      } else {
        let errorMessage = 'Failed to start checkout'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = res.statusText || errorMessage
        }
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Pack Selection — clickable cards */}
      <div>
        <Label className="text-base font-medium">How many labels do you need?</Label>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {packs.map((pack) => (
            <button
              key={pack.key}
              type="button"
              aria-label={`Select ${pack.name} for $${pack.price}`}
              aria-pressed={selectedPack === pack.key}
              onClick={() => setValue('packType', pack.key)}
              className={cn(
                'relative rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50',
                selectedPack === pack.key
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-muted'
              )}
            >
              {pack.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                  Best Value
                </Badge>
              )}
              {selectedPack === pack.key && (
                <div className="absolute right-3 top-3">
                  <Check className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="font-semibold">{pack.name}</div>
              <div className="text-xs text-muted-foreground">{pack.description}</div>
              <div className="mt-3">
                <span className="text-2xl font-bold">${pack.price}</span>
                {pack.labels > 1 && (
                  <span className="ml-1 text-sm text-muted-foreground">
                    / ${pack.perLabel} per label
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                One-time purchase
              </div>
              <ul className="mt-3 space-y-1">
                {pack.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-medium">Shipping Address</h3>
          <p className="text-sm text-muted-foreground">
            Where should we ship the label{currentPack.labels > 1 ? 's' : ''}? We&apos;ll send
            {currentPack.labels > 1 ? ` ${currentPack.labels} labels` : ' the label'} to this
            address within 3-5 business days.
          </p>
        </div>

        {/* Saved address selector */}
        <SavedAddressSelector onSelect={fillAddress} onDefaultLoaded={fillAddress} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              {...register('shippingAddress.name')}
            />
            {errors.shippingAddress?.name && (
              <p className="text-sm text-destructive">{errors.shippingAddress.name.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="line1">Address Line 1</Label>
            <Input
              id="line1"
              placeholder="123 Main Street"
              {...register('shippingAddress.line1')}
            />
            {errors.shippingAddress?.line1 && (
              <p className="text-sm text-destructive">{errors.shippingAddress.line1.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="line2">Address Line 2 (Optional)</Label>
            <Input
              id="line2"
              placeholder="Apartment, suite, etc."
              {...register('shippingAddress.line2')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="London" {...register('shippingAddress.city')} />
            {errors.shippingAddress?.city && (
              <p className="text-sm text-destructive">{errors.shippingAddress.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State/Province (Optional)</Label>
            <Input id="state" {...register('shippingAddress.state')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="SW1A 1AA"
              {...register('shippingAddress.postalCode')}
            />
            {errors.shippingAddress?.postalCode && (
              <p className="text-sm text-destructive">
                {errors.shippingAddress.postalCode.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={selectedCountry}
              onValueChange={(value) => setValue('shippingAddress.country', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.shippingAddress?.country && (
              <p className="text-sm text-destructive">{errors.shippingAddress.country.message}</p>
            )}
          </div>

          {/* Save this address toggle */}
          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center gap-3">
              <Switch
                id="saveAddress"
                checked={saveAddress}
                onCheckedChange={setSaveAddress}
              />
              <Label htmlFor="saveAddress" className="text-sm font-normal cursor-pointer">
                Save this address for next time
              </Label>
            </div>
            {saveAddress && (
              <Input
                placeholder='Give it a name, e.g. "Home", "Office"'
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                className="mt-2"
              />
            )}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          Order Summary
        </h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {currentPack.name} &times; tracking label
            </span>
            <span className="font-medium">${currentPack.price}.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium text-green-600 dark:text-green-400">Free</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">${currentPack.price}.00</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to payment...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${currentPack.price}.00 — Proceed to Stripe
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Secure payment via Stripe. Your card details never touch our servers.
      </p>
    </form>
  )
}
