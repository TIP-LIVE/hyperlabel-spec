'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const ENDPOINTS = [
  { label: 'All Endpoints', value: '' },
  { label: 'Connector', value: 'connector' },
  { label: 'Location Update', value: 'location-update' },
]

const STATUS_CODES = [
  { label: 'All Statuses', value: '' },
  { label: '200 OK', value: '200' },
  { label: '400 Bad Request', value: '400' },
  { label: '401 Unauthorized', value: '401' },
  { label: '500 Error', value: '500' },
]

export function WebhookFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={searchParams.get('endpoint') || ''}
        onChange={(e) => updateParam('endpoint', e.target.value)}
        className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
      >
        {ENDPOINTS.map((ep) => (
          <option key={ep.value} value={ep.value}>
            {ep.label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get('statusCode') || ''}
        onChange={(e) => updateParam('statusCode', e.target.value)}
        className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
      >
        {STATUS_CODES.map((sc) => (
          <option key={sc.value} value={sc.value}>
            {sc.label}
          </option>
        ))}
      </select>
    </div>
  )
}
