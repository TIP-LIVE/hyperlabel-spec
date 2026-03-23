import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createHypothesisSchema } from '@/lib/validations/research'

/**
 * GET /api/v1/admin/research/hypotheses
 * List all research hypotheses
 */
export async function GET() {
  try {
    await requireAdmin()

    const hypotheses = await db.researchHypothesis.findMany({
      orderBy: { code: 'asc' },
    })

    return NextResponse.json({ hypotheses })
  } catch (error) {
    return handleApiError(error, 'listing research hypotheses')
  }
}

/**
 * POST /api/v1/admin/research/hypotheses
 * Create a new research hypothesis
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = createHypothesisSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const hypothesis = await db.researchHypothesis.create({
      data: validated.data,
    })

    return NextResponse.json(hypothesis, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating research hypothesis')
  }
}
