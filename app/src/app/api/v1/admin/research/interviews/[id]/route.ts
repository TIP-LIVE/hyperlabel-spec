import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateInterviewSchema } from '@/lib/validations/research'

/**
 * GET /api/v1/admin/research/interviews/[id]
 * Get a single interview with lead + script info
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const interview = await db.researchInterview.findUnique({
      where: { id },
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
            screeningNotes: true,
            pilotInterest: true,
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Find the approved script for this lead's persona
    const script = await db.researchScript.findFirst({
      where: {
        persona: interview.lead.persona,
        status: 'APPROVED',
      },
      orderBy: { version: 'desc' },
    })

    return NextResponse.json({ interview, script })
  } catch (error) {
    return handleApiError(error, 'fetching interview')
  }
}

/**
 * PATCH /api/v1/admin/research/interviews/[id]
 * Update interview (notes, status, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = updateInterviewSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.researchInterview.findUnique({
      where: { id },
      include: { lead: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = { ...validated.data }

    // If completing the interview, set completedAt and move lead to COMPLETED
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      data.completedAt = data.completedAt || new Date().toISOString()

      await db.researchLead.update({
        where: { id: existing.leadId },
        data: { status: 'COMPLETED' },
      })
    }

    // If starting the interview, move to IN_PROGRESS
    if (data.status === 'IN_PROGRESS' && existing.status === 'SCHEDULED') {
      // Lead stays at SCHEDULED — only moves to COMPLETED on completion
    }

    const interview = await db.researchInterview.update({
      where: { id },
      data,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            persona: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(interview)
  } catch (error) {
    return handleApiError(error, 'updating interview')
  }
}
