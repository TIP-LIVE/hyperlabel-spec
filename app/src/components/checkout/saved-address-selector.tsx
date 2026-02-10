'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookUser } from 'lucide-react'
import { getCountryName } from '@/lib/constants/countries'

interface SavedAddress {
  id: string
  label: string
  name: string
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
  isDefault: boolean
}

interface SavedAddressSelectorProps {
  /** Called when user selects a saved address — auto-fills the form */
  onSelect: (address: {
    name: string
    line1: string
    line2: string
    city: string
    state: string
    postalCode: string
    country: string
  }) => void
  /** Called when the default address is auto-loaded on mount */
  onDefaultLoaded?: (address: {
    name: string
    line1: string
    line2: string
    city: string
    state: string
    postalCode: string
    country: string
  }) => void
}

export function SavedAddressSelector({ onSelect, onDefaultLoaded }: SavedAddressSelectorProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/v1/addresses')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setAddresses(data.addresses || [])

        // Auto-fill default address on first load
        const defaultAddr = (data.addresses || []).find((a: SavedAddress) => a.isDefault)
        if (defaultAddr && onDefaultLoaded) {
          onDefaultLoaded({
            name: defaultAddr.name,
            line1: defaultAddr.line1,
            line2: defaultAddr.line2 ?? '',
            city: defaultAddr.city,
            state: defaultAddr.state ?? '',
            postalCode: defaultAddr.postalCode,
            country: defaultAddr.country,
          })
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    load()
    return () => { cancelled = true }
  }, [onDefaultLoaded])

  // Don't render anything until we know if there are addresses
  if (!loaded || addresses.length === 0) return null

  const handleSelect = (addressId: string) => {
    const addr = addresses.find((a) => a.id === addressId)
    if (!addr) return
    onSelect({
      name: addr.name,
      line1: addr.line1,
      line2: addr.line2 ?? '',
      city: addr.city,
      state: addr.state ?? '',
      postalCode: addr.postalCode,
      country: addr.country,
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <BookUser className="h-4 w-4 text-muted-foreground" />
        Use a saved address
      </div>
      <Select onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select a saved address..." />
        </SelectTrigger>
        <SelectContent>
          {addresses.map((addr) => (
            <SelectItem key={addr.id} value={addr.id}>
              <span className="font-medium">{addr.label}</span>
              <span className="ml-2 text-muted-foreground">
                — {addr.line1}, {addr.city}, {getCountryName(addr.country)}
              </span>
              {addr.isDefault && (
                <span className="ml-1 text-xs text-primary">(Default)</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
