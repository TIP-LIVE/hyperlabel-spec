import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { pruneWebhookLogs } from '@/lib/webhook-log'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  await requireAdmin()

  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get('endpoint')
  const iccid = searchParams.get('iccid')
  const eventType = searchParams.get('eventType')
  const statusCode = searchParams.get('statusCode')
  const q = searchParams.get('q')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const perPage = 50

  const where: Prisma.WebhookLogWhereInput = {}
  if (endpoint) where.endpoint = endpoint
  if (iccid) where.iccid = iccid
  if (eventType) where.eventType = eventType
  if (statusCode === 'pending') {
    where.statusCode = null
  } else if (statusCode) {
    where.statusCode = parseInt(statusCode, 10)
  }
  if (q) {
    const label = await db.label.findFirst({
      where: { deviceId: { contains: q, mode: 'insensitive' } },
      select: { iccid: true },
    })
    if (label?.iccid) {
      where.iccid = label.iccid
    } else {
      where.iccid = { contains: q, mode: 'insensitive' }
    }
  }

  const [logs, total] = await Promise.all([
    db.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    db.webhookLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    pagination: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  })
}

export async function DELETE() {
  await requireAdmin()
  const deleted = await pruneWebhookLogs()
  return NextResponse.json({ deleted })
}
