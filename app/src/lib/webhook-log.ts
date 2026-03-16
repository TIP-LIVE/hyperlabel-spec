import { db } from '@/lib/db'

const SENSITIVE_HEADERS = [
  'x-api-key',
  'authorization',
  'x-onomondo-webhook-secret',
  'x-webhook-secret',
]

function sanitizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = SENSITIVE_HEADERS.includes(key.toLowerCase())
      ? '[REDACTED]'
      : value
  })
  return result
}

export function createWebhookLog(params: {
  id: string
  endpoint: string
  method?: string
  headers: Headers
  body: unknown
  ipAddress?: string
  iccid?: string | null
  eventType?: string | null
}) {
  db.webhookLog
    .create({
      data: {
        id: params.id,
        endpoint: params.endpoint,
        method: params.method ?? 'POST',
        headers: sanitizeHeaders(params.headers) as object,
        body: (params.body ?? {}) as object,
        ipAddress: params.ipAddress,
        iccid: params.iccid ?? undefined,
        eventType: params.eventType ?? undefined,
      },
    })
    .catch((err) =>
      console.warn('[webhook-log] failed to create log:', err)
    )
}

export function updateWebhookLog(
  id: string,
  params: {
    statusCode?: number
    processingResult?: unknown
    durationMs?: number
  }
) {
  db.webhookLog
    .update({
      where: { id },
      data: {
        statusCode: params.statusCode,
        processingResult: (params.processingResult ?? undefined) as object | undefined,
        durationMs: params.durationMs,
      },
    })
    .catch((err) =>
      console.warn('[webhook-log] failed to update log:', err)
    )
}

export async function pruneWebhookLogs(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const { count: deletedByAge } = await db.webhookLog.deleteMany({
    where: { createdAt: { lt: sevenDaysAgo } },
  })

  const totalRemaining = await db.webhookLog.count()
  let deletedByCount = 0
  if (totalRemaining > 1000) {
    const cutoff = await db.webhookLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: 1000,
      take: 1,
      select: { createdAt: true },
    })
    if (cutoff[0]) {
      const result = await db.webhookLog.deleteMany({
        where: { createdAt: { lte: cutoff[0].createdAt } },
      })
      deletedByCount = result.count
    }
  }

  return deletedByAge + deletedByCount
}
