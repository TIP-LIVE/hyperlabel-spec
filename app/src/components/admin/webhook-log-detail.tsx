'use client'

import { useState, Fragment, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ChevronRight, ChevronDown, Webhook, Copy, Check } from 'lucide-react'
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

function EventTypeBadge({ eventType }: { eventType: string | null }) {
  if (!eventType) return <span className="text-muted-foreground">—</span>

  if (eventType === 'location') {
    return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 font-normal">{eventType}</Badge>
  }
  if (eventType.startsWith('network-')) {
    return <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 font-normal">{eventType}</Badge>
  }
  return <Badge variant="outline" className="font-normal">{eventType}</Badge>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy() }}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  const text = JSON.stringify(data, null, 2)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
        <CopyButton text={text} />
      </div>
      <pre className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground overflow-auto max-h-64 font-mono">
        {text}
      </pre>
    </div>
  )
}

export function WebhookLogTable({ logs, iccidToLabel }: { logs: WebhookLogEntry[]; iccidToLabel: Record<string, string> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Webhook}
        title="No webhook logs found"
        description="No logs match the current filters. Try adjusting your search or filter criteria."
      />
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
            <th className="pb-3 font-medium">Label</th>
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
                  <td className="py-3">
                    <EventTypeBadge eventType={log.eventType} />
                  </td>
                  <td className="py-3 font-mono text-xs text-foreground">
                    {log.iccid || '—'}
                  </td>
                  <td className="py-3 text-sm text-foreground">
                    {log.iccid && iccidToLabel[log.iccid] ? iccidToLabel[log.iccid] : '—'}
                  </td>
                  <td className="py-3">
                    <StatusBadge code={log.statusCode} />
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {log.durationMs !== null ? `${log.durationMs}ms` : '—'}
                  </td>
                  <td className="py-3 text-xs max-w-[250px] truncate">
                    {result?.skipped
                      ? <span className="text-muted-foreground">{result.reason as string}</span>
                      : result?.error
                        ? <span className="text-red-500">{String(result.error).slice(0, 50)}</span>
                        : result?.locationId
                          ? (
                            <span className={result.shipmentId ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                              OK → {(result.locationId as string).slice(0, 8)}…
                              {result.shipmentId ? ' ✓' : ' ⚠ unlinked'}
                            </span>
                          )
                          : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={9} className="bg-muted/30 px-6 py-5">
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3">
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
                              Method &amp; Endpoint
                            </h4>
                            <p className="text-sm text-foreground">
                              <Badge variant="outline" className="mr-2 font-mono text-xs">{log.method}</Badge>
                              {log.endpoint}
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

                        <div className="border-t border-border pt-4 space-y-4">
                          <JsonBlock label="Request Body" data={log.body} />

                          {result && (
                            <JsonBlock label="Processing Result" data={result} />
                          )}

                          <JsonBlock label="Headers" data={log.headers} />
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
