'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'

interface AdminSearchProps {
  placeholder?: string
  paramName?: string
}

export function AdminSearch({ placeholder = 'Search...', paramName = 'q' }: AdminSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get(paramName) || '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from URL changes
  useEffect(() => {
    setValue(searchParams.get(paramName) || '')
  }, [searchParams, paramName])

  const updateSearch = (newValue: string) => {
    setValue(newValue)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (newValue) {
        params.set(paramName, newValue)
      } else {
        params.delete(paramName)
      }
      // Reset to page 1 on new search
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    }, 400)
  }

  const clearSearch = () => {
    setValue('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete(paramName)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <Input
        value={value}
        onChange={(e) => updateSearch(e.target.value)}
        placeholder={placeholder}
        className="border-gray-700 bg-gray-800 pl-9 pr-8 text-white placeholder:text-gray-500"
      />
      {value && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
