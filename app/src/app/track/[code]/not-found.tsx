import Link from 'next/link'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TrackingNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle className="mt-4">Shipment Not Found</CardTitle>
          <CardDescription>
            We couldn&apos;t find a shipment with this tracking code. Please check the code and try
            again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact the sender for the correct tracking
            link.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline">
              <Link href="/">Go to TIP</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Track Your Own Cargo</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
