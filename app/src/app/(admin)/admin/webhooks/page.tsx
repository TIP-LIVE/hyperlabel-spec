import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { AdminSearch } from '@/components/admin/admin-search'
import { WebhookFilters } from '@/components/admin/webhook-filters'
import { WebhookLogTable } from '@/components/admin/webhook-log-detail'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Webhook Logs',
  description: 'Debug incoming Onomondo webhooks',
}

interface PageProps {
  searchParams: Promise<{
    endpoint?: string
    statusCode?: string
    eventType?: string
    q?: string
    page?: string
  }>
}

export default async function AdminWebhooksPage({ searchParams }: PageProps) {
  const { endpoint, statusCode, eventType, q, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1)
  const perPage = 50

  const where: Prisma.WebhookLogWhereInput = {}
  if (endpoint) where.endpoint = endpoint
  if (eventType) where.eventType = eventType
  if (statusCode) where.statusCode = parseInt(statusCode, 10)
  if (q) where.iccid = { contains: q, mode: 'insensitive' }

  const [logs, total] = await Promise.all([
    db.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    db.webhookLog.count({ where }),
  ])

  // Build ICCID → deviceId map for label column
  const iccids = [...new Set(logs.map((l) => l.iccid).filter(Boolean))] as string[]
  const labels = iccids.length > 0
    ? await db.label.findMany({
        where: { iccid: { in: iccids } },
        select: { iccid: true, deviceId: true },
      })
    : []
  const iccidToLabel: Record<string, string> = {}
  for (const l of labels) {
    if (l.iccid) iccidToLabel[l.iccid] = l.deviceId
  }

  const totalPages = Math.ceil(total / perPage)

  // Build search params string for pagination links
  const filterParams = new URLSearchParams()
  if (endpoint) filterParams.set('endpoint', endpoint)
  if (statusCode) filterParams.set('statusCode', statusCode)
  if (eventType) filterParams.set('eventType', eventType)
  if (q) filterParams.set('q', q)

  // Serialize logs for client component
  const serializedLogs = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    headers: log.headers as Record<string, string>,
    body: log.body as Record<string, unknown>,
    processingResult: log.processingResult as Record<string, unknown> | null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Webhook Logs</h1>
        <p className="text-muted-foreground">
          Debug incoming Onomondo webhooks — raw payloads and processing results
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch placeholder="Search by ICCID..." />
        <WebhookFilters />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            Webhook Events ({total})
          </CardTitle>
          <CardDescription>
            {q
              ? `Showing results for "${q}"`
              : 'Click a row to expand and see the full payload'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookLogTable logs={serializedLogs} iccidToLabel={iccidToLabel} />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/webhooks?${new URLSearchParams({ ...Object.fromEntries(filterParams), page: String(page - 1) }).toString()}`}
                    className="rounded bg-muted px-3 py-1 text-sm text-foreground hover:bg-accent"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/webhooks?${new URLSearchParams({ ...Object.fromEntries(filterParams), page: String(page + 1) }).toString()}`}
                    className="rounded bg-muted px-3 py-1 text-sm text-foreground hover:bg-accent"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
