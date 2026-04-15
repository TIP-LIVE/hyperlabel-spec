'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { countries } from '@/lib/constants/countries'

interface EditDispatchDialogProps {
  shipmentId: string
  currentName: string | null
  currentDestination: string | null
  currentReceiverFirstName: string | null
  currentReceiverLastName: string | null
  currentReceiverEmail: string | null
  currentReceiverPhone: string | null
  currentLine1: string | null
  currentLine2: string | null
  currentCity: string | null
  currentState: string | null
  currentPostalCode: string | null
  currentCountry: string | null
}

export function EditDispatchDialog({
  shipmentId,
  currentName,
  currentDestination,
  currentReceiverFirstName,
  currentReceiverLastName,
  currentReceiverEmail,
  currentReceiverPhone,
  currentLine1,
  currentLine2,
  currentCity,
  currentState,
  currentPostalCode,
  currentCountry,
}: EditDispatchDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState(currentName || '')
  const [receiverFirstName, setReceiverFirstName] = useState(currentReceiverFirstName || '')
  const [receiverLastName, setReceiverLastName] = useState(currentReceiverLastName || '')
  const [receiverEmail, setReceiverEmail] = useState(currentReceiverEmail || '')
  const [receiverPhone, setReceiverPhone] = useState(currentReceiverPhone || '')
  const [line1, setLine1] = useState(currentLine1 || '')
  const [line2, setLine2] = useState(currentLine2 || '')
  const [city, setCity] = useState(currentCity || '')
  const [state, setState] = useState(currentState || '')
  const [postalCode, setPostalCode] = useState(currentPostalCode || '')
  const [country, setCountry] = useState(currentCountry || '')
  // Per-field error messages. Keys match input ids below.
  // Shown inline and via aria-invalid red border; cleared as the user types.
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  // If any receiver/address field has content, the whole required set must be
  // filled — prevents saves like the one that left the shipment with an address
  // but no country. Matches shipperAddressSchema used by the public receiver-fill flow.
  const shippingBlockTouched = Boolean(
    receiverFirstName.trim() ||
      receiverLastName.trim() ||
      receiverEmail.trim() ||
      receiverPhone.trim() ||
      line1.trim() ||
      line2.trim() ||
      city.trim() ||
      state.trim() ||
      postalCode.trim() ||
      country.trim(),
  )

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function resetForm() {
    setName(currentName || '')
    setReceiverFirstName(currentReceiverFirstName || '')
    setReceiverLastName(currentReceiverLastName || '')
    setReceiverEmail(currentReceiverEmail || '')
    setReceiverPhone(currentReceiverPhone || '')
    setLine1(currentLine1 || '')
    setLine2(currentLine2 || '')
    setCity(currentCity || '')
    setState(currentState || '')
    setPostalCode(currentPostalCode || '')
    setCountry(currentCountry || '')
    setErrors({})
  }

  function composeAddress() {
    const parts = [line1, line2, city, state, postalCode].filter(Boolean)
    if (country) {
      const c = countries.find((ct) => ct.code === country)
      if (c) parts.push(c.name)
    }
    return parts.join(', ')
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Dispatch name is required'

    if (shippingBlockTouched) {
      if (!receiverFirstName.trim()) e.receiverFirstName = 'First name is required'
      if (!receiverLastName.trim()) e.receiverLastName = 'Last name is required'
      if (!receiverEmail.trim()) {
        e.receiverEmail = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail.trim())) {
        e.receiverEmail = 'Enter a valid email address'
      }
      if (!line1.trim()) e.line1 = 'Address line 1 is required'
      if (!city.trim()) e.city = 'City is required'
      if (!postalCode.trim()) e.postalCode = 'Postal code is required'
      if (!country.trim()) e.country = 'Country is required'
    }
    return e
  }

  async function handleSave() {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error('Please fill in all required fields')
      return
    }
    setErrors({})

    setIsLoading(true)

    try {
      const body: Record<string, unknown> = {}

      if (name !== (currentName || '')) body.name = name
      if (receiverFirstName !== (currentReceiverFirstName || '')) body.receiverFirstName = receiverFirstName
      if (receiverLastName !== (currentReceiverLastName || '')) body.receiverLastName = receiverLastName
      if (receiverEmail !== (currentReceiverEmail || '')) body.consigneeEmail = receiverEmail
      if (receiverPhone !== (currentReceiverPhone || '')) body.consigneePhone = receiverPhone
      if (line1 !== (currentLine1 || '')) body.destinationLine1 = line1
      if (line2 !== (currentLine2 || '')) body.destinationLine2 = line2
      if (city !== (currentCity || '')) body.destinationCity = city
      if (state !== (currentState || '')) body.destinationState = state
      if (postalCode !== (currentPostalCode || '')) body.destinationPostalCode = postalCode
      if (country !== (currentCountry || '')) body.destinationCountry = country

      // Recompose destinationAddress if any address field changed
      const addressChanged = 'destinationLine1' in body || 'destinationLine2' in body ||
        'destinationCity' in body || 'destinationState' in body ||
        'destinationPostalCode' in body || 'destinationCountry' in body
      if (addressChanged) {
        body.destinationAddress = composeAddress()
      }

      // Also compose destinationName from receiver name if changed
      if ('receiverFirstName' in body || 'receiverLastName' in body) {
        body.destinationName = [receiverFirstName, receiverLastName].filter(Boolean).join(' ')
      }

      if (Object.keys(body).length === 0) {
        setOpen(false)
        return
      }

      const response = await fetch(`/api/v1/dispatch/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update dispatch')
      }

      toast.success('Dispatch updated')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Dispatch</DialogTitle>
          <DialogDescription>
            Update the dispatch details, receiver information, or delivery address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Dispatch Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-dispatch-name">
              Dispatch Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-dispatch-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearError('name')
              }}
              placeholder="e.g., Warehouse labels — Batch 1"
              disabled={isLoading}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Receiver */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Receiver</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-receiver-first">
                  First Name{shippingBlockTouched && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="edit-receiver-first"
                  value={receiverFirstName}
                  onChange={(e) => {
                    setReceiverFirstName(e.target.value)
                    clearError('receiverFirstName')
                  }}
                  placeholder="Jane"
                  disabled={isLoading}
                  aria-invalid={!!errors.receiverFirstName}
                />
                {errors.receiverFirstName && (
                  <p className="text-sm text-destructive">{errors.receiverFirstName}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-receiver-last">
                  Last Name{shippingBlockTouched && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="edit-receiver-last"
                  value={receiverLastName}
                  onChange={(e) => {
                    setReceiverLastName(e.target.value)
                    clearError('receiverLastName')
                  }}
                  placeholder="Doe"
                  disabled={isLoading}
                  aria-invalid={!!errors.receiverLastName}
                />
                {errors.receiverLastName && (
                  <p className="text-sm text-destructive">{errors.receiverLastName}</p>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-receiver-email">
                  Email{shippingBlockTouched && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="edit-receiver-email"
                  type="email"
                  value={receiverEmail}
                  onChange={(e) => {
                    setReceiverEmail(e.target.value)
                    clearError('receiverEmail')
                  }}
                  placeholder="jane@acme.com"
                  disabled={isLoading}
                  aria-invalid={!!errors.receiverEmail}
                />
                {errors.receiverEmail && (
                  <p className="text-sm text-destructive">{errors.receiverEmail}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-receiver-phone">Phone (optional)</Label>
                <Input
                  id="edit-receiver-phone"
                  type="tel"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="+44 7700 900000"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Delivery Address</p>
            {/* Show existing composed address as hint when structured fields are empty (legacy dispatches) */}
            {currentDestination && !currentLine1 && !currentCity && (
              <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                Current address: {currentDestination}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-line1">
                Address Line 1{shippingBlockTouched && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id="edit-line1"
                value={line1}
                onChange={(e) => {
                  setLine1(e.target.value)
                  clearError('line1')
                }}
                placeholder="123 Main St"
                disabled={isLoading}
                aria-invalid={!!errors.line1}
              />
              {errors.line1 && <p className="text-sm text-destructive">{errors.line1}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-line2">Address Line 2 (optional)</Label>
              <Input
                id="edit-line2"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="Suite 200"
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-city">
                  City{shippingBlockTouched && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="edit-city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value)
                    clearError('city')
                  }}
                  placeholder="Berlin"
                  disabled={isLoading}
                  aria-invalid={!!errors.city}
                />
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-state">State / Region (optional)</Label>
                <Input
                  id="edit-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-postal">
                  Postal Code{shippingBlockTouched && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="edit-postal"
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value)
                    clearError('postalCode')
                  }}
                  placeholder="10115"
                  disabled={isLoading}
                  aria-invalid={!!errors.postalCode}
                />
                {errors.postalCode && (
                  <p className="text-sm text-destructive">{errors.postalCode}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-country">
                  Country{shippingBlockTouched && <span className="text-destructive"> *</span>}
                </Label>
                <Select
                  value={country}
                  onValueChange={(v) => {
                    setCountry(v)
                    clearError('country')
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger id="edit-country" aria-invalid={!!errors.country}>
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
                {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
