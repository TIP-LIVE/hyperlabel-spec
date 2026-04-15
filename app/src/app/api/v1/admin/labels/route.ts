import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { provisionLabel, ProvisionLabelError } from '@/lib/label-id'
import { z } from 'zod'

// Labels must be provisioned with an IMEI so we can compute the spec's
// NNNNNYYYY displayId (see docs/DEVICE-LOCATION-SYSTEM.md — Display ID Format).
// The legacy `deviceId`-only path produced rows with displayId=null whose
// sticker URLs never resolve via the proxy rewrite.
const addLabelsSchema = z.object({
  labels: z
    .array(
      z.object({
        imei: z.string().regex(/^\d{15}$/, 'IMEI must be exactly 15 digits'),
        iccid: z.string().optional(),
        firmwareVersion: z.string().optional(),
      })
    )
    .min(1),
})

/**
 * POST /api/v1/admin/labels
 * Add labels to inventory (admin only).
 *
 * Each row must include a 15-digit IMEI. The handler calls provisionLabel()
 * which allocates a counter and writes a spec-compliant deviceId + displayId.
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

    const created: Array<{ deviceId: string; displayId: string; imei: string }> = []
    const duplicates: Array<{ imei: string; existingDisplayId: string | null }> = []

    for (const row of validated.data.labels) {
      try {
        const label = await provisionLabel({
          imei: row.imei,
          firmwareVersion: row.firmwareVersion ?? null,
        })
        created.push({
          deviceId: label.deviceId,
          displayId: label.displayId,
          imei: label.imei,
        })
        if (row.iccid) {
          await db.label.update({
            where: { id: label.id },
            data: { iccid: row.iccid },
          })
        }
      } catch (err) {
        if (err instanceof ProvisionLabelError && err.code === 'DUPLICATE_IMEI') {
          duplicates.push({
            imei: row.imei,
            existingDisplayId: err.existingLabel?.displayId ?? null,
          })
          continue
        }
        throw err
      }
    }

    return NextResponse.json({
      count: created.length,
      created,
      ...(duplicates.length > 0 && { duplicates }),
    })
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
