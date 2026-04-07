'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, MapPin } from 'lucide-react'
import { priorityCountries, otherCountries } from '@/lib/constants/countries'
import { countryFormats, defaultCountryFormat } from '@/lib/constants/country-formats'
import { shipperAddressSchema, type ShipperAddressInput } from '@/lib/validations/address'

interface ShipperAddressFormProps {
  shareCode: string
  onSubmitted: (data: ShipperAddressInput) => void
}

export function ShipperAddressForm({ shareCode, onSubmitted }: ShipperAddressFormProps) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShipperAddressInput>({
    resolver: zodResolver(shipperAddressSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'GB',
      email: '',
      phone: '',
    },
  })

  const selectedCountry = watch('country')
  const fmt = useMemo(() => countryFormats[selectedCountry] || defaultCountryFormat, [selectedCountry])

  const onSubmit = async (data: ShipperAddressInput) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/track/${shareCode}/submit-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to submit address')
      }

      toast.success('Address submitted successfully')
      onSubmitted(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit address')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          Where should we send your labels?
        </CardTitle>
        <CardDescription>
          Enter your delivery address so we can ship the labels to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="shipper-country">Country</Label>
            <Select
              value={selectedCountry}
              onValueChange={(value) => setValue('country', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Popular</SelectLabel>
                  {priorityCountries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>All Countries</SelectLabel>
                  {otherCountries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>

          {/* First + Last Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shipper-first">First Name</Label>
              <Input id="shipper-first" placeholder="Jane" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipper-last">Last Name</Label>
              <Input id="shipper-last" placeholder="Doe" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Address lines */}
          <div className="space-y-2">
            <Label htmlFor="shipper-line1">Address Line 1</Label>
            <Input id="shipper-line1" placeholder={fmt.line1} {...register('line1')} />
            {errors.line1 && (
              <p className="text-sm text-destructive">{errors.line1.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipper-line2">Address Line 2 (Optional)</Label>
            <Input id="shipper-line2" placeholder="Apartment, suite, etc." {...register('line2')} />
          </div>

          {/* City + State */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shipper-city">City</Label>
              <Input id="shipper-city" placeholder={fmt.city} {...register('city')} />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipper-state">{fmt.stateLabel}</Label>
              <Input id="shipper-state" placeholder={fmt.state} {...register('state')} />
            </div>
          </div>

          {/* Postal Code */}
          <div className="space-y-2 sm:w-1/2">
            <Label htmlFor="shipper-postalCode">{fmt.postalCodeLabel}</Label>
            <Input id="shipper-postalCode" placeholder={fmt.postalCode} {...register('postalCode')} />
            {errors.postalCode && (
              <p className="text-sm text-destructive">{errors.postalCode.message}</p>
            )}
          </div>

          {/* Contact info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shipper-email">Email</Label>
              <Input id="shipper-email" type="email" placeholder="you@company.com" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipper-phone">Phone (Optional)</Label>
              <Input id="shipper-phone" type="tel" placeholder="+44 7700 900000" {...register('phone')} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Address'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
