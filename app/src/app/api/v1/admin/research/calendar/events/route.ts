import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { scheduleInterviewSchema } from '@/lib/validations/research'
import {
  createInterviewEvent,
  buildInterviewDescription,
  isCalendarConfigured,
} from '@/lib/google-calendar'

/**
 * GET /api/v1/admin/research/calendar/events
 * List upcoming interviews from DB
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const includesPast = searchParams.get('past') === 'true'

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }
    if (!includesPast) {
      where.OR = [
        { scheduledAt: { gte: new Date() } },
        { status: 'SCHEDULED' },
      ]
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
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    })

    return NextResponse.json({ interviews })
  } catch (error) {
    return handleApiError(error, 'listing calendar events')
  }
}

/**
 * POST /api/v1/admin/research/calendar/events
 * Schedule a new interview — creates DB record + Google Calendar event + moves lead to SCHEDULED
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = scheduleInterviewSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { leadId, scheduledAt, duration, notes } = validated.data

    // Verify lead exists
    const lead = await db.researchLead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Calculate end time
    const startDate = new Date(scheduledAt)
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000)

    // Create Google Calendar event (non-blocking if not configured)
    let calendarEventId: string | null = null
    if (isCalendarConfigured()) {
      try {
        const result = await createInterviewEvent({
          summary: `TIP User Research — ${lead.name}`,
          description: buildInterviewDescription(lead.name),
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          attendeeEmail: lead.email || undefined,
        })
        calendarEventId = result.eventId
      } catch (calError) {
        console.error('Failed to create Google Calendar event:', calError)
        // Continue without calendar event — interview record is still created
      }
    }

    // Create interview record + move lead to SCHEDULED in a transaction
    const [interview] = await db.$transaction([
      db.researchInterview.create({
        data: {
          leadId,
          scheduledAt: startDate,
          duration,
          calendarEventId,
          notes: notes ? { text: notes } : undefined,
          status: 'SCHEDULED',
        },
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
      }),
      db.researchLead.update({
        where: { id: leadId },
        data: { status: 'SCHEDULED' },
      }),
    ])

    return NextResponse.json(interview, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'scheduling interview')
  }
}
