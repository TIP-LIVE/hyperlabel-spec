'use client'

import { useState, useCallback } from 'react'
import { forwardGeocode } from '@/lib/geocode-client'
import { getCountryName } from '@/lib/constants/countries'
import { toast } from 'sonner'

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

/**
 * Hook that handles geocoding a saved address and providing the result
 * to an AddressInput via its externalValue prop.
 */
export function useSavedAddress(
  onAddressSelect: (address: string, lat: number, lng: number) => void
) {
  const [externalValue, setExternalValue] = useState<string | undefined>(undefined)
  const [geocoding, setGeocoding] = useState(false)

  const handleSavedSelect = useCallback(
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
        setExternalValue(formatted)
        onAddressSelect(formatted, 0, 0)
        toast.warning('Could not determine exact coordinates for this address')
      }
    },
    [onAddressSelect]
  )

  return { externalValue, geocoding, handleSavedSelect }
}
