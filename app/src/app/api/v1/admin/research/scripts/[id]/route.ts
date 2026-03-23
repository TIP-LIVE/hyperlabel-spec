import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateScriptSchema } from '@/lib/validations/research'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/admin/research/scripts/[id]
 * Fetch a single research script
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const script = await db.researchScript.findUnique({
      where: { id },
    })

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    return NextResponse.json(script)
  } catch (error) {
    return handleApiError(error, 'fetching research script')
  }
}

/**
 * PATCH /api/v1/admin/research/scripts/[id]
 * Update a research script (only when DRAFT)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = updateScriptSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.researchScript.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft scripts can be edited. Request changes first if the script is in review.' },
        { status: 400 }
      )
    }

    const script = await db.researchScript.update({
      where: { id },
      data: validated.data,
    })

    return NextResponse.json(script)
  } catch (error) {
    return handleApiError(error, 'updating research script')
  }
}

/**
 * DELETE /api/v1/admin/research/scripts/[id]
 * Delete a research script (only DRAFT or ARCHIVED)
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await db.researchScript.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Only draft or archived scripts can be deleted' },
        { status: 400 }
      )
    }

    await db.researchScript.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'deleting research script')
  }
}
