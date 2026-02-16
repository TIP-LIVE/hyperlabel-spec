import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod'

const addLabelsSchema = z.object({
  labels: z.array(
    z.object({
      deviceId: z.string().min(1, 'Device ID is required'),
      imei: z.string().optional(),
      iccid: z.string().optional(),
    })
  ),
})

/**
 * POST /api/v1/admin/labels
 * Add labels to inventory (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = addLabelsSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { labels } = validated.data

    // Check for duplicates
    const deviceIds = labels.map((l) => l.deviceId)
    const existing = await db.label.findMany({
      where: { deviceId: { in: deviceIds } },
      select: { deviceId: true },
    })

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'Duplicate device IDs',
          details: existing.map((l) => l.deviceId),
        },
        { status: 400 }
      )
    }

    // Create labels
    const created = await db.label.createMany({
      data: labels.map((l) => ({
        deviceId: l.deviceId,
        imei: l.imei,
        iccid: l.iccid,
        status: 'INVENTORY',
      })),
    })

    return NextResponse.json({ count: created.count })
  } catch (error) {
    return handleApiError(error, 'adding labels')
  }
}

/**
 * GET /api/v1/admin/labels
 * List all labels with filters (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }

    const [labels, total] = await Promise.all([
      db.label.findMany({
        where,
        include: {
          orderLabels: {
            take: 1,
            include: { order: { select: { id: true, user: { select: { email: true } } } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.label.count({ where }),
    ])

    return NextResponse.json({
      labels,
      pagination: { total, limit, offset },
    })
  } catch (error) {
    return handleApiError(error, 'listing labels')
  }
}
