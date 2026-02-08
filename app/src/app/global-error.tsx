'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
            <p className="mb-6 text-muted-foreground">
              An unexpected error occurred. Our team has been notified and is working on a fix.
            </p>
            {error.digest && (
              <p className="mb-6 font-mono text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={reset}>Try again</Button>
              <Button variant="outline" onClick={() => (window.location.href = '/')}>
                Go to homepage
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
