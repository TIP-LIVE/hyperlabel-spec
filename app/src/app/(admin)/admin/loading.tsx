import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-gray-800 bg-gray-800/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24 bg-gray-700" />
              <Skeleton className="h-4 w-4 bg-gray-700" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 bg-gray-700" />
              <Skeleton className="mt-1 h-3 w-32 bg-gray-700" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="border-gray-800 bg-gray-800/50">
            <CardHeader>
              <Skeleton className="h-6 w-40 bg-gray-700" />
              <Skeleton className="h-4 w-56 bg-gray-700" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-32 bg-gray-700" />
                      <Skeleton className="mt-1 h-3 w-24 bg-gray-700" />
                    </div>
                    <Skeleton className="h-6 w-16 bg-gray-700" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
