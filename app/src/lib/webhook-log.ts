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

export interface WebhookLogCreateParams {
  id: string
  endpoint: string
  method?: string
  headers: Headers
  body: unknown
  ipAddress?: string
  iccid?: string | null
  eventType?: string | null
}

export async function createWebhookLog(params: WebhookLogCreateParams): Promise<void> {
  const data = {
    id: params.id,
    endpoint: params.endpoint,
    method: params.method ?? 'POST',
    headers: sanitizeHeaders(params.headers) as object,
    body: (params.body ?? {}) as object,
    ipAddress: params.ipAddress,
    iccid: params.iccid ?? undefined,
    eventType: params.eventType ?? undefined,
  }

  // Retry once after 100ms to handle transient Neon connection issues
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await db.webhookLog.create({ data })
      return
    } catch (err) {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 100))
        continue
      }
      throw err
    }
  }
}

export async function updateWebhookLog(
  id: string,
  params: {
    statusCode?: number
    processingResult?: unknown
    durationMs?: number
  }
): Promise<void> {
  await db.webhookLog.update({
    where: { id },
    data: {
      statusCode: params.statusCode,
      processingResult: (params.processingResult ?? undefined) as object | undefined,
      durationMs: params.durationMs,
    },
  })
}

/**
 * Fallback: create-or-update a webhook log record.
 * Used when the initial createWebhookLog failed — ensures the audit
 * record is captured with final status even if the early write was lost.
 */
export async function upsertWebhookLog(
  createParams: WebhookLogCreateParams,
  updateParams: {
    statusCode?: number
    processingResult?: unknown
    durationMs?: number
  }
): Promise<void> {
  const headers = sanitizeHeaders(createParams.headers) as object
  const body = (createParams.body ?? {}) as object

  await db.webhookLog.upsert({
    where: { id: createParams.id },
    update: {
      statusCode: updateParams.statusCode,
      processingResult: (updateParams.processingResult ?? undefined) as object | undefined,
      durationMs: updateParams.durationMs,
    },
    create: {
      id: createParams.id,
      endpoint: createParams.endpoint,
      method: createParams.method ?? 'POST',
      headers,
      body,
      ipAddress: createParams.ipAddress,
      iccid: createParams.iccid ?? undefined,
      eventType: createParams.eventType ?? undefined,
      statusCode: updateParams.statusCode,
      processingResult: (updateParams.processingResult ?? undefined) as object | undefined,
      durationMs: updateParams.durationMs,
    },
  })
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
