'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-orange-100 p-4">
            <AlertCircle className="h-12 w-12 text-orange-600" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Oops! Something went wrong</h1>
        <p className="mb-6 text-muted-foreground">
          We encountered an error while loading this page. Please try again.
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
