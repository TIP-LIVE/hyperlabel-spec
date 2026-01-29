import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-2 h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Orders */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="mt-1 h-5 w-8" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="mt-1 h-5 w-24" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="mt-1 h-5 w-32" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="mt-1 h-5 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
