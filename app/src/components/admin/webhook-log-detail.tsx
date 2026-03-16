'use client'

import { useState, Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface WebhookLogEntry {
  id: string
  endpoint: string
  method: string
  headers: Record<string, string>
  body: Record<string, unknown>
  ipAddress: string | null
  statusCode: number | null
  processingResult: Record<string, unknown> | null
  iccid: string | null
  eventType: string | null
  durationMs: number | null
  createdAt: string
}

function StatusBadge({ code }: { code: number | null }) {
  if (code === null) return <Badge variant="outline">Pending</Badge>
  if (code === 200)
    return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">{code}</Badge>
  if (code === 400)
    return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">{code}</Badge>
  return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">{code}</Badge>
}

function EndpointBadge({ endpoint }: { endpoint: string }) {
  if (endpoint === 'connector')
    return <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-600/30">Connector</Badge>
  return <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-600/30">Location</Badge>
}

export function WebhookLogTable({ logs }: { logs: WebhookLogEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No webhook logs found
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium w-8"></th>
            <th className="pb-3 font-medium">Time</th>
            <th className="pb-3 font-medium">Endpoint</th>
            <th className="pb-3 font-medium">Event Type</th>
            <th className="pb-3 font-medium">ICCID</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Duration</th>
            <th className="pb-3 font-medium">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id
            const result = log.processingResult as Record<string, unknown> | null

            return (
              <Fragment key={log.id}>
                <tr
                  className="text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <td className="py-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="py-3 text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </td>
                  <td className="py-3">
                    <EndpointBadge endpoint={log.endpoint} />
                  </td>
                  <td className="py-3 text-foreground">
                    {log.eventType || '—'}
                  </td>
                  <td className="py-3 font-mono text-xs text-foreground">
                    {log.iccid || '—'}
                  </td>
                  <td className="py-3">
                    <StatusBadge code={log.statusCode} />
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {log.durationMs !== null ? `${log.durationMs}ms` : '—'}
                  </td>
                  <td className="py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {result?.skipped
                      ? (result.reason as string)
                      : result?.error
                        ? String(result.error).slice(0, 50)
                        : result?.locationId
                          ? `OK → ${(result.locationId as string).slice(0, 8)}…`
                          : '—'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="bg-muted/30 px-4 py-4">
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">
                              Timestamp
                            </h4>
                            <p className="text-sm text-foreground font-mono">
                              {new Date(log.createdAt).toISOString()}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">
                              IP Address
                            </h4>
                            <p className="text-sm text-foreground font-mono">
                              {log.ipAddress || '—'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">
                            Request Body
                          </h4>
                          <pre className="rounded-md bg-muted p-3 text-xs text-foreground overflow-auto max-h-64">
                            {JSON.stringify(log.body, null, 2)}
                          </pre>
                        </div>

                        {result && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">
                              Processing Result
                            </h4>
                            <pre className="rounded-md bg-muted p-3 text-xs text-foreground overflow-auto max-h-40">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">
                            Headers
                          </h4>
                          <pre className="rounded-md bg-muted p-3 text-xs text-foreground overflow-auto max-h-40">
                            {JSON.stringify(log.headers, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
