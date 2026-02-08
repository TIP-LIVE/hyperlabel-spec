'use client'

import { LoadScript } from '@react-google-maps/api'
import { ReactNode } from 'react'
import { MapPin } from 'lucide-react'

const libraries: ('places' | 'geometry')[] = ['places', 'geometry']

interface GoogleMapsProviderProps {
  children: ReactNode
}

function MapLoadingSkeleton() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg bg-muted/50">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <MapPin className="h-8 w-8 text-muted-foreground/40 animate-bounce" />
        </div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey || apiKey === 'REPLACE_ME') {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
        <div>
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-medium text-muted-foreground">Google Maps API key not configured</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file
          </p>
        </div>
      </div>
    )
  }

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
      loadingElement={<MapLoadingSkeleton />}
    >
      {children}
    </LoadScript>
  )
}
