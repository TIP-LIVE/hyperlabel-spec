'use client'

import { useEffect, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
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
  const [open, setOpen] = useState(false)

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

  const handleSelect = (addr: SavedAddress) => {
    onSelect({
      name: addr.name,
      line1: addr.line1,
      line2: addr.line2 ?? '',
      city: addr.city,
      state: addr.state ?? '',
      postalCode: addr.postalCode,
      country: addr.country,
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <BookUser className="h-3.5 w-3.5" />
              <span className="sr-only">Use saved address</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Use saved address</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-72 p-1">
        {addresses.map((addr) => (
          <button
            key={addr.id}
            type="button"
            className="flex w-full flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            onClick={() => handleSelect(addr)}
          >
            <span className="font-medium">
              {addr.label}
              {addr.isDefault && (
                <span className="ml-1 text-xs text-primary">(Default)</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {addr.line1}, {addr.city}, {getCountryName(addr.country)}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
