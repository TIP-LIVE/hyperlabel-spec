'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2, X, Search, CheckCircle2, Navigation, Sparkles } from 'lucide-react'

interface AddressResult {
  displayName: string
  lat: number
  lng: number
}

interface AddressInputProps {
  id?: string
  placeholder?: string
  defaultValue?: string
  disabled?: boolean
  onAddressSelect: (address: string, lat: number, lng: number) => void
  className?: string
}

/**
 * Address input with autocomplete suggestions.
 * Uses OpenStreetMap Nominatim (free, no API key).
 */
export function AddressInput({ id, placeholder, defaultValue, disabled, onAddressSelect, className }: AddressInputProps) {
  const [query, setQuery] = useState(defaultValue || '')
  const [results, setResults] = useState<AddressResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSelected, setIsSelected] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [normalizing, setNormalizing] = useState(false)
  const [normalized, setNormalized] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchAddress = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([])
      setIsOpen(false)
      setNoResults(false)
      return
    }

    setLoading(true)
    setNoResults(false)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TIP-Cargo-Tracking/1.0 (tip.live)',
          },
        }
      )

      if (!res.ok) return

      const data = await res.json()
      const mapped: AddressResult[] = data.map((item: { display_name: string; lat: string; lon: string }) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }))

      setResults(mapped)
      if (mapped.length > 0) {
        setIsOpen(true)
        setNoResults(false)
      } else {
        setIsOpen(true)
        setNoResults(true)
      }
      setSelectedIndex(-1)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    setIsSelected(false)
    // Also update the parent with the raw text (coordinates will be set on select)
    onAddressSelect(value, 0, 0)

    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchAddress(value), 500)
  }

  const handleSelect = (result: AddressResult) => {
    setQuery(result.displayName)
    setIsOpen(false)
    setIsSelected(true)
    setNoResults(false)
    onAddressSelect(result.displayName, result.lat, result.lng)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setIsSelected(false)
    setNoResults(false)
    onAddressSelect('', 0, 0)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || noResults) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) return

    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18`,
            { headers: { 'User-Agent': 'TIP-Cargo-Tracking/1.0 (tip.live)' } }
          )
          if (res.ok) {
            const data = await res.json()
            const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            setQuery(address)
            setIsSelected(true)
            onAddressSelect(address, latitude, longitude)
          } else {
            const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            setQuery(fallback)
            setIsSelected(true)
            onAddressSelect(fallback, latitude, longitude)
          }
        } catch {
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          setQuery(fallback)
          setIsSelected(true)
          onAddressSelect(fallback, latitude, longitude)
        } finally {
          setGeoLoading(false)
        }
      },
      () => {
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [onAddressSelect])

  // AI-powered address normalization
  const handleNormalize = useCallback(async () => {
    if (!query || query.length < 5 || isSelected) return

    setNormalizing(true)
    try {
      const res = await fetch('/api/v1/ai/normalize-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: query }),
      })

      if (res.ok) {
        const data = await res.json()
        const result = data.result
        if (result?.normalized && result.confidence > 0.5 && result.normalized !== query) {
          setQuery(result.normalized)
          setNormalized(true)
          // Try to geocode the normalized address
          searchAddress(result.normalized)
          onAddressSelect(result.normalized, 0, 0)
        }
      }
    } catch {
      // Silently fail — normalization is optional
    } finally {
      setNormalizing(false)
    }
  }, [query, isSelected, searchAddress, onAddressSelect])

  const supportsGeolocation = typeof navigator !== 'undefined' && 'geolocation' in navigator

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${className || ''}`}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!loading && isSelected && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {!loading && query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear address"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-1.5">
        {supportsGeolocation && !isSelected && query.length === 0 && (
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
          >
            {geoLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Navigation className="h-3 w-3" />
            )}
            {geoLoading ? 'Getting location...' : 'Use my current location'}
          </button>
        )}
        {!isSelected && !normalized && query.length >= 5 && (
          <button
            type="button"
            onClick={handleNormalize}
            disabled={normalizing}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
          >
            {normalizing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {normalizing ? 'Cleaning up...' : 'Clean up with AI'}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {noResults ? (
            <div className="flex flex-col items-center gap-1.5 px-3 py-4 text-center">
              <Search className="h-4 w-4 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No addresses found</p>
              <p className="text-xs text-muted-foreground/70">Try a different search term</p>
            </div>
          ) : (
            <>
              <ul className="max-h-48 overflow-auto py-1">
                {results.map((result, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        index === selectedIndex ? 'bg-accent' : ''
                      }`}
                      onClick={() => handleSelect(result)}
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">{result.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
                Powered by OpenStreetMap
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
