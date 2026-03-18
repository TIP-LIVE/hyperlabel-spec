'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ENDPOINTS = [
  { label: 'All Endpoints', value: 'all' },
  { label: 'Connector', value: 'connector' },
  { label: 'Location Update', value: 'location-update' },
]

const STATUS_CODES = [
  { label: 'All Statuses', value: 'all' },
  { label: '200 OK', value: '200' },
  { label: '400 Bad Request', value: '400' },
  { label: '401 Unauthorized', value: '401' },
  { label: '500 Error', value: '500' },
]

interface LabelOption {
  deviceId: string
  iccid: string
}

export function WebhookFilters({ labels = [] }: { labels?: LabelOption[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {labels.length > 0 && (
        <Select
          value={searchParams.get('label') || 'all'}
          onValueChange={(value) => updateParam('label', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Labels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {labels.map((l) => (
              <SelectItem key={l.iccid} value={l.iccid}>
                {l.deviceId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={searchParams.get('endpoint') || 'all'}
        onValueChange={(value) => updateParam('endpoint', value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Endpoints" />
        </SelectTrigger>
        <SelectContent>
          {ENDPOINTS.map((ep) => (
            <SelectItem key={ep.value} value={ep.value}>
              {ep.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('statusCode') || 'all'}
        onValueChange={(value) => updateParam('statusCode', value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_CODES.map((sc) => (
            <SelectItem key={sc.value} value={sc.value}>
              {sc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
