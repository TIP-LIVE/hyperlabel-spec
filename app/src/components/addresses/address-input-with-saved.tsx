'use client'

import { useState, useCallback } from 'react'
import { AddressInput } from '@/components/ui/address-input'
import { SavedAddressSelector } from '@/components/addresses/saved-address-selector'
import { forwardGeocode } from '@/lib/geocode-client'
import { getCountryName } from '@/lib/constants/countries'
import { toast } from 'sonner'

interface AddressInputWithSavedProps {
  id?: string
  placeholder?: string
  defaultValue?: string
  disabled?: boolean
  onAddressSelect: (address: string, lat: number, lng: number) => void
  className?: string
}

function formatSavedAddress(addr: {
  line1: string
  city: string
  postalCode: string
  country: string
}): string {
  return [addr.line1, addr.city, addr.postalCode, getCountryName(addr.country)]
    .filter(Boolean)
    .join(', ')
}

export function AddressInputWithSaved({
  id,
  placeholder,
  defaultValue,
  disabled,
  onAddressSelect,
  className,
}: AddressInputWithSavedProps) {
  const [externalValue, setExternalValue] = useState<string | undefined>(undefined)
  const [geocoding, setGeocoding] = useState(false)

  const handleSavedAddressSelect = useCallback(
    async (addr: {
      name: string
      line1: string
      line2: string
      city: string
      state: string
      postalCode: string
      country: string
    }) => {
      const formatted = formatSavedAddress(addr)
      setGeocoding(true)

      const result = await forwardGeocode(formatted)
      setGeocoding(false)

      if (result) {
        setExternalValue(result.displayName)
        onAddressSelect(result.displayName, result.lat, result.lng)
      } else {
        // Fallback: use formatted string without coordinates
        setExternalValue(formatted)
        onAddressSelect(formatted, 0, 0)
        toast.warning('Could not determine exact coordinates for this address')
      }
    },
    [onAddressSelect]
  )

  return (
    <div className="space-y-2">
      <SavedAddressSelector onSelect={handleSavedAddressSelect} />
      <AddressInput
        id={id}
        placeholder={placeholder}
        defaultValue={defaultValue}
        disabled={disabled || geocoding}
        onAddressSelect={onAddressSelect}
        className={className}
        externalValue={externalValue}
      />
    </div>
  )
}
