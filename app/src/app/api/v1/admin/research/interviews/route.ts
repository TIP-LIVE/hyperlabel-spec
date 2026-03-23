import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/admin/research/interviews
 * List interviews with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const leadId = searchParams.get('leadId')
    const upcoming = searchParams.get('upcoming')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (leadId) {
      where.leadId = leadId
    }
    if (upcoming === 'true') {
      where.status = 'SCHEDULED'
      where.scheduledAt = { gte: new Date() }
    }

    const interviews = await db.researchInterview.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            role: true,
            persona: true,
            status: true,
          },
        },
      },
      orderBy: { scheduledAt: upcoming === 'true' ? 'asc' : 'desc' },
      take: limit,
    })

    return NextResponse.json({ interviews })
  } catch (error) {
    return handleApiError(error, 'listing interviews')
  }
}
