'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { priorityCountries, otherCountries } from '@/lib/constants/countries'
import { savedAddressSchema, type SavedAddressInput } from '@/lib/validations/address'

/** Country-specific placeholders and field labels */
const countryFormats: Record<string, {
  name: string
  line1: string
  city: string
  state: string
  stateLabel: string
  postalCode: string
  postalCodeLabel: string
}> = {
  GB: { name: 'John Smith', line1: '10 Downing Street', city: 'London', state: 'Greater London', stateLabel: 'County (Optional)', postalCode: 'SW1A 1AA', postalCodeLabel: 'Postcode' },
  US: { name: 'John Doe', line1: '1600 Pennsylvania Ave', city: 'Washington', state: 'DC', stateLabel: 'State', postalCode: '20500', postalCodeLabel: 'ZIP Code' },
  DE: { name: 'Max Mustermann', line1: 'Friedrichstraße 43', city: 'Berlin', state: 'Berlin', stateLabel: 'Bundesland (Optional)', postalCode: '10117', postalCodeLabel: 'PLZ' },
  FR: { name: 'Jean Dupont', line1: '55 Rue du Faubourg', city: 'Paris', state: 'Île-de-France', stateLabel: 'Région (Optional)', postalCode: '75008', postalCodeLabel: 'Code postal' },
  NL: { name: 'Jan de Vries', line1: 'Keizersgracht 174', city: 'Amsterdam', state: 'Noord-Holland', stateLabel: 'Province (Optional)', postalCode: '1016 DW', postalCodeLabel: 'Postcode' },
  BE: { name: 'Jan Peeters', line1: 'Rue de la Loi 16', city: 'Brussels', state: 'Brussels', stateLabel: 'Province (Optional)', postalCode: '1000', postalCodeLabel: 'Postcode' },
  AT: { name: 'Anna Gruber', line1: 'Stephansplatz 1', city: 'Vienna', state: 'Vienna', stateLabel: 'Bundesland (Optional)', postalCode: '1010', postalCodeLabel: 'PLZ' },
  CH: { name: 'Hans Müller', line1: 'Bahnhofstrasse 1', city: 'Zurich', state: 'Zürich', stateLabel: 'Canton (Optional)', postalCode: '8001', postalCodeLabel: 'PLZ' },
  PL: { name: 'Jan Kowalski', line1: 'ul. Marszałkowska 1', city: 'Warsaw', state: 'Mazowieckie', stateLabel: 'Voivodeship (Optional)', postalCode: '00-001', postalCodeLabel: 'Kod pocztowy' },
  UA: { name: 'Іван Петренко', line1: 'вул. Хрещатик 1', city: 'Kyiv', state: 'Kyiv', stateLabel: 'Oblast (Optional)', postalCode: '01001', postalCodeLabel: 'Postal Code' },
  CN: { name: '张伟', line1: '长安街1号', city: 'Beijing', state: 'Beijing', stateLabel: 'Province', postalCode: '100000', postalCodeLabel: 'Postal Code' },
}

const defaultFormat = { name: 'John Doe', line1: '123 Main Street', city: 'City', state: '', stateLabel: 'State / Province (Optional)', postalCode: '12345', postalCodeLabel: 'Postal Code' }

interface AddressFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: SavedAddressInput & { id: string }
}

export function AddressFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: AddressFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SavedAddressInput>({
    resolver: zodResolver(savedAddressSchema),
    defaultValues: initialData ?? {
      label: '',
      name: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'GB',
    },
  })

  const selectedCountry = watch('country')
  const fmt = useMemo(() => countryFormats[selectedCountry] || defaultFormat, [selectedCountry])

  const onSubmit = async (data: SavedAddressInput) => {
    setLoading(true)
    try {
      const url = isEditing
        ? `/api/v1/addresses/${initialData.id}`
        : '/api/v1/addresses'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save address')
      }

      toast.success(isEditing ? 'Address updated' : 'Address saved')
      reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of this saved address.'
              : 'Save an address for quick reuse when creating shipments.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Label / nickname */}
          <div className="space-y-2">
            <Label htmlFor="addr-label">Address Label</Label>
            <Input
              id="addr-label"
              placeholder='e.g. "Home", "Warehouse Berlin"'
              {...register('label')}
            />
            {errors.label && (
              <p className="text-sm text-destructive">{errors.label.message}</p>
            )}
          </div>

          {/* Country — placed before address fields so placeholders update first */}
          <div className="space-y-2">
            <Label htmlFor="addr-country">Country</Label>
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

          {/* Recipient name */}
          <div className="space-y-2">
            <Label htmlFor="addr-name">Full Name</Label>
            <Input id="addr-name" placeholder={fmt.name} {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Address lines */}
          <div className="space-y-2">
            <Label htmlFor="addr-line1">Address Line 1</Label>
            <Input id="addr-line1" placeholder={fmt.line1} {...register('line1')} />
            {errors.line1 && (
              <p className="text-sm text-destructive">{errors.line1.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="addr-line2">Address Line 2 (Optional)</Label>
            <Input id="addr-line2" placeholder="Apartment, suite, etc." {...register('line2')} />
          </div>

          {/* City + State row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="addr-city">City</Label>
              <Input id="addr-city" placeholder={fmt.city} {...register('city')} />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-state">{fmt.stateLabel}</Label>
              <Input id="addr-state" placeholder={fmt.state} {...register('state')} />
            </div>
          </div>

          {/* Postal Code */}
          <div className="space-y-2 sm:w-1/2">
            <Label htmlFor="addr-postalCode">{fmt.postalCodeLabel}</Label>
            <Input id="addr-postalCode" placeholder={fmt.postalCode} {...register('postalCode')} />
            {errors.postalCode && (
              <p className="text-sm text-destructive">{errors.postalCode.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Address'
              ) : (
                'Save Address'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
