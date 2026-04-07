import Link from 'next/link'
import { redirect } from 'next/navigation'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Package, ArrowRight, AlertTriangle, Send } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order Confirmed',
  description: 'Your TIP order has been placed successfully',
}

interface PageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { session_id } = await searchParams

  if (!session_id) {
    redirect('/dashboard')
  }

  // Retrieve session details from Stripe
  let session = null
  let quantity = 1
  let sessionError = false

  if (isStripeConfigured()) {
    try {
      session = await stripe.checkout.sessions.retrieve(session_id)
      quantity = parseInt(session.metadata?.quantity || '1', 10)
      
      // Validate the quantity is reasonable
      if (isNaN(quantity) || quantity < 1 || quantity > 100) {
        quantity = 1
      }
    } catch (error) {
      console.error('Error retrieving session:', error)
      sessionError = true
      // Continue to show generic success page
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
          <CardDescription>
            Your labels are reserved in our warehouse. Next, tell us where to ship them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-semibold">
                  {sessionError ? 'Your Tracking Labels' : `${quantity} Tracking Label${quantity > 1 ? 's' : ''}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Reserved in our warehouse, ready to ship
                </p>
              </div>
            </div>
          </div>

          {sessionError && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-left text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
              <p className="text-yellow-800 dark:text-yellow-200">
                We couldn&apos;t load your order details, but don&apos;t worry—your payment was successful. 
                Check your email for confirmation.
              </p>
            </div>
          )}

          {/* What's Next */}
          <div className="space-y-3 text-left">
            <h3 className="font-semibold">What&apos;s next?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  1
                </span>
                <span>Tell us where to send your labels (3-5 business days)</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </span>
                <span>We ship them — the receiver activates on arrival</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  3
                </span>
                <span>Attach to cargo and track door-to-door in real-time</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/dispatch/new">
                <Send className="mr-2 h-4 w-4" />
                Set up dispatch
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>

          {session && (
            <p className="text-xs text-muted-foreground">
              Order ID: {session.id.slice(-8).toUpperCase()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
