'use client'

import { LoadScript } from '@react-google-maps/api'
import { ReactNode } from 'react'

const libraries: ('places' | 'geometry')[] = ['places', 'geometry']

interface GoogleMapsProviderProps {
  children: ReactNode
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey || apiKey === 'REPLACE_ME') {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
        <div>
          <p className="font-medium text-muted-foreground">Google Maps API key not configured</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file
          </p>
        </div>
      </div>
    )
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
      {children}
    </LoadScript>
  )
}
