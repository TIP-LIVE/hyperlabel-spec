'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Radio } from 'lucide-react'

interface Props {
  shipmentId: string
  /** Initial number of locations already on the shipment (for SSR-computed state) */
  initialLocationCount?: number
}

/**
 * Shown on /cargo/[id] when the shipment has no LocationEvents yet.
 * Polls the cargo endpoint every 10s and dispatches a custom event so
 * the parent server component can refetch (per CLAUDE.md: use custom
 * events, not router.refresh).
 */
export function WaitingForSignal({ shipmentId, initialLocationCount = 0 }: Props) {
  const [locationCount, setLocationCount] = useState(initialLocationCount)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (locationCount > 0) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/cargo/${shipmentId}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const count = data.shipment?.locations?.length ?? 0
        if (count > 0) {
          setLocationCount(count)
          window.dispatchEvent(new CustomEvent('cargo:first-signal', { detail: { shipmentId } }))
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {}
    }

    intervalRef.current = setInterval(poll, 10_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [shipmentId, locationCount])

  if (locationCount > 0) return null

  return (
    <Card className="border-dashed">
      <CardContent className="flex items-start gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Radio className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">Waiting for first signal</p>
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your label hasn&apos;t reported yet. Make sure the cargo is outdoors or near a window.
            Labels typically report within 1–5 minutes of being moved.
          </p>
          <p className="text-xs text-muted-foreground">Checking every 10 seconds…</p>
        </div>
      </CardContent>
    </Card>
  )
}
