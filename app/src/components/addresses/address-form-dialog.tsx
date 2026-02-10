'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { countries } from '@/lib/constants/countries'
import { savedAddressSchema, type SavedAddressInput } from '@/lib/validations/address'

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
              : 'Save a shipping address for quick reuse when buying labels.'}
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

          {/* Recipient name */}
          <div className="space-y-2">
            <Label htmlFor="addr-name">Full Name</Label>
            <Input id="addr-name" placeholder="John Doe" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Address lines */}
          <div className="space-y-2">
            <Label htmlFor="addr-line1">Address Line 1</Label>
            <Input id="addr-line1" placeholder="123 Main Street" {...register('line1')} />
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
              <Input id="addr-city" placeholder="London" {...register('city')} />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addr-state">State / Province (Optional)</Label>
              <Input id="addr-state" {...register('state')} />
            </div>
          </div>

          {/* Postal Code + Country row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="addr-postalCode">Postal Code</Label>
              <Input id="addr-postalCode" placeholder="SW1A 1AA" {...register('postalCode')} />
              {errors.postalCode && (
                <p className="text-sm text-destructive">{errors.postalCode.message}</p>
              )}
            </div>

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
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>
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
