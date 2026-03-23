import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  rateLimit,
  RATE_LIMIT_DEVICE,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit'
import { verifyOnomondoRequest } from '@/lib/onomondo-auth'
import { createWebhookLog, updateWebhookLog, upsertWebhookLog } from '@/lib/webhook-log'

const batteryReportSchema = z.object({
  iccid: z.string().min(1),
  battery: z.number().min(0).max(100),
})

/**
 * POST /api/v1/device/onomondo
 *
 * Receives battery reports from device firmware via Onomondo connector.
 * Location data comes separately from Onomondo location-update webhook.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const logId = crypto.randomUUID()

  try {
    const apiKey =
      req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(
      `onomondo:${apiKey || getClientIp(req)}`,
      RATE_LIMIT_DEVICE
    )
    if (!rl.success) {
      upsertWebhookLog(
        { id: crypto.randomUUID(), endpoint: 'connector', headers: req.headers, body: { _note: 'rate limited — body not parsed' }, ipAddress: getClientIp(req) },
        { statusCode: 429, processingResult: { error: 'Rate limited' }, durationMs: Date.now() - startTime }
      ).catch(() => {})
      return rateLimitResponse(rl)
    }

    const expectedApiKey =
      process.env.ONOMONDO_CONNECTOR_API_KEY || process.env.DEVICE_API_KEY
    const expectedWebhookSecret = process.env.ONOMONDO_WEBHOOK_SECRET

    if (
      !verifyOnomondoRequest({
        req,
        expectedApiKey,
        expectedWebhookSecret,
      })
    ) {
      console.warn('[webhook:onomondo:battery] 401 Invalid credentials')
      upsertWebhookLog(
        { id: crypto.randomUUID(), endpoint: 'connector', headers: req.headers, body: { _note: 'auth failed — body not parsed' }, ipAddress: getClientIp(req) },
        { statusCode: 401, processingResult: { error: 'Invalid webhook credentials' }, durationMs: Date.now() - startTime }
      ).catch(() => {})
      return NextResponse.json({ error: 'Invalid webhook credentials' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch (err) {
      upsertWebhookLog(
        { id: crypto.randomUUID(), endpoint: 'connector', headers: req.headers, body: { _note: 'invalid JSON', error: String(err) }, ipAddress: getClientIp(req) },
        { statusCode: 400, processingResult: { error: 'Invalid JSON' }, durationMs: Date.now() - startTime }
      ).catch(() => {})
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const rawBody = body as Record<string, unknown>

    try {
      await createWebhookLog({
        id: logId,
        endpoint: 'connector',
        headers: req.headers,
        body: rawBody,
        ipAddress: getClientIp(req),
        iccid: rawBody?.iccid as string | undefined,
      })
    } catch (err) {
      console.error('[webhook:onomondo:battery] FAILED to persist webhook log', {
        logId, error: String(err),
      })
    }

    const validated = batteryReportSchema.safeParse(body)
    if (!validated.success) {
      await updateWebhookLog(logId, { statusCode: 400, processingResult: { error: 'Validation failed', details: validated.error.flatten() }, durationMs: Date.now() - startTime })
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { iccid, battery } = validated.data

    const label = await db.label.findUnique({ where: { iccid } })
    if (!label) {
      await updateWebhookLog(logId, { statusCode: 404, processingResult: { error: 'Label not found' }, durationMs: Date.now() - startTime })
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    await db.label.update({
      where: { id: label.id },
      data: { batteryPct: battery },
    })

    console.info('[webhook:onomondo:battery] updated', { iccid, battery })

    await updateWebhookLog(logId, { statusCode: 200, processingResult: { success: true, labelId: label.id, battery }, durationMs: Date.now() - startTime })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[webhook:onomondo:battery] error:', error)
    try {
      await updateWebhookLog(logId, { statusCode: 500, processingResult: { error: String(error) }, durationMs: Date.now() - startTime })
    } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
