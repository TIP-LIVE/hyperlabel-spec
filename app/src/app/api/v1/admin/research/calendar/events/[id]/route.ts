import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateInterviewSchema } from '@/lib/validations/research'
import {
  updateInterviewEvent,
  deleteInterviewEvent,
  isCalendarConfigured,
} from '@/lib/google-calendar'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/admin/research/calendar/events/[id]
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
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
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    return NextResponse.json(interview)
  } catch (error) {
    return handleApiError(error, 'fetching interview')
  }
}

/**
 * PATCH /api/v1/admin/research/calendar/events/[id]
 * Reschedule or update an interview
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    const existing = await db.researchInterview.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // If rescheduling, update Google Calendar event
    if (validated.data.scheduledAt && existing.calendarEventId && isCalendarConfigured()) {
      const newStart = new Date(validated.data.scheduledAt)
      const duration = validated.data.duration || existing.duration || 60
      const newEnd = new Date(newStart.getTime() + duration * 60 * 1000)

      try {
        await updateInterviewEvent(existing.calendarEventId, {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        })
      } catch (calError) {
        console.error('Failed to update Google Calendar event:', calError)
      }
    }

    const data: Record<string, unknown> = {}
    if (validated.data.scheduledAt) data.scheduledAt = new Date(validated.data.scheduledAt)
    if (validated.data.duration !== undefined) data.duration = validated.data.duration
    if (validated.data.status) data.status = validated.data.status
    if (validated.data.notes !== undefined) data.notes = validated.data.notes
    if (validated.data.keyQuotes !== undefined) data.keyQuotes = validated.data.keyQuotes
    if (validated.data.hypothesisSignals !== undefined) data.hypothesisSignals = validated.data.hypothesisSignals
    if (validated.data.completedAt !== undefined) {
      data.completedAt = validated.data.completedAt ? new Date(validated.data.completedAt) : null
    }
    if (validated.data.recordingUrl !== undefined) data.recordingUrl = validated.data.recordingUrl || null
    if (validated.data.transcriptUrl !== undefined) data.transcriptUrl = validated.data.transcriptUrl || null

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

/**
 * DELETE /api/v1/admin/research/calendar/events/[id]
 * Cancel an interview — marks as CANCELLED and deletes Google Calendar event
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await db.researchInterview.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Delete Google Calendar event
    if (existing.calendarEventId && isCalendarConfigured()) {
      try {
        await deleteInterviewEvent(existing.calendarEventId)
      } catch (calError) {
        console.error('Failed to delete Google Calendar event:', calError)
      }
    }

    const interview = await db.researchInterview.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json(interview)
  } catch (error) {
    return handleApiError(error, 'cancelling interview')
  }
}
