'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, Loader2, BellOff } from 'lucide-react'

export default function UnsubscribePage() {
  const params = useParams<{ code: string }>()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleUnsubscribe = async () => {
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch(
        `/api/v1/track/${params.code}/unsubscribe?email=${encodeURIComponent(email)}`,
        { method: 'POST' }
      )
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Invalid Link</h1>
          <p className="mt-2 text-muted-foreground">This unsubscribe link appears to be invalid.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Unsubscribed</h1>
          <p className="mt-2 text-muted-foreground">
            You will no longer receive email updates about this shipment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <BellOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Unsubscribe from shipment updates</h1>
        <p className="mt-2 text-muted-foreground">
          Click below to stop receiving email notifications about this shipment at{' '}
          <strong className="text-foreground">{email}</strong>.
        </p>
        <Button
          onClick={handleUnsubscribe}
          disabled={status === 'loading'}
          className="mt-6"
          size="lg"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Unsubscribing...
            </>
          ) : (
            'Unsubscribe'
          )}
        </Button>
        {status === 'error' && (
          <p className="mt-4 text-sm text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
