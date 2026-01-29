'use client'

import { useState } from 'react'
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
import { Loader2, CreditCard } from 'lucide-react'

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

const countries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'PL', name: 'Poland' },
  { code: 'UA', name: 'Ukraine' },
]

const packLabels = {
  starter: '1 Label - Starter',
  team: '5 Labels - Team (Best Value)',
  volume: '10 Labels - Volume',
}

export function BuyLabelsForm() {
  const [loading, setLoading] = useState(false)

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
          // Redirect to Stripe Checkout
          window.location.href = url
        } else {
          toast.error('Failed to create checkout session')
        }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to start checkout')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Pack Selection */}
      <div className="space-y-2">
        <Label>Label Pack</Label>
        <Select
          value={selectedPack}
          onValueChange={(value: 'starter' | 'team' | 'volume') => setValue('packType', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="starter">{packLabels.starter}</SelectItem>
            <SelectItem value="team">{packLabels.team}</SelectItem>
            <SelectItem value="volume">{packLabels.volume}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shipping Address */}
      <div className="space-y-4">
        <h3 className="font-medium">Shipping Address</h3>

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
            Proceed to Payment
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        You&apos;ll be redirected to Stripe for secure payment processing
      </p>
    </form>
  )
}
