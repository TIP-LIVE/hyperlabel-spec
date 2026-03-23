import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateHypothesisSchema } from '@/lib/validations/research'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/admin/research/hypotheses/[id]
 * Fetch a single research hypothesis
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const hypothesis = await db.researchHypothesis.findUnique({ where: { id } })
    if (!hypothesis) {
      return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 })
    }

    return NextResponse.json(hypothesis)
  } catch (error) {
    return handleApiError(error, 'fetching research hypothesis')
  }
}

/**
 * PATCH /api/v1/admin/research/hypotheses/[id]
 * Update a research hypothesis
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = updateHypothesisSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.researchHypothesis.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 })
    }

    const hypothesis = await db.researchHypothesis.update({
      where: { id },
      data: validated.data,
    })

    return NextResponse.json(hypothesis)
  } catch (error) {
    return handleApiError(error, 'updating research hypothesis')
  }
}
