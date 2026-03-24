import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { sendResearchEmailSchema, type ResearchEmailType } from '@/lib/validations/research'
import { render } from '@react-email/components'
import { sendEmail } from '@/lib/email'
import { ResearchOutreachEmail } from '@/emails/research-outreach'
import { ResearchScheduledEmail } from '@/emails/research-scheduled'
import { ResearchReminderEmail } from '@/emails/research-reminder'
import { ResearchThankYouEmail } from '@/emails/research-thank-you'
import { ResearchReferralEmail } from '@/emails/research-referral'

const DEFAULT_SUBJECTS: Record<ResearchEmailType, string> = {
  outreach: "TIP Research \u2014 We'd love to hear your perspective",
  scheduled: 'Your interview with TIP is confirmed',
  reminder: 'Reminder: Your interview with TIP is tomorrow',
  thank_you: 'Thank you for your time \u2014 TIP Research',
  referral: "Know someone in logistics? We'd love an introduction",
}

const CALENDAR_LINK = process.env.RESEARCH_CALENDAR_LINK || 'https://calendly.com/tip-research'

/**
 * POST /api/v1/admin/research/email/send
 * Send a research email to a lead
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = sendResearchEmailSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { leadId, type, subject, customMessage } = validated.data

    // Fetch lead with latest interview
    const lead = await db.researchLead.findUnique({
      where: { id: leadId },
      include: {
        interviews: {
          where: { status: { in: ['SCHEDULED', 'COMPLETED'] } },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.email) {
      return NextResponse.json(
        { error: 'Lead does not have an email address' },
        { status: 400 }
      )
    }

    const interview = lead.interviews[0]

    // Look up approved email template for this type + persona
    const emailTemplate = await db.researchEmailTemplate.findFirst({
      where: {
        type,
        status: 'APPROVED',
        OR: [
          { persona: lead.persona as 'CONSIGNEE' | 'FORWARDER' | 'SHIPPER' },
          { persona: null },
        ],
      },
      orderBy: { persona: 'desc' }, // Prefer persona-specific over generic
    })

    if (!emailTemplate) {
      return NextResponse.json(
        { error: `No approved email template found for "${type}" emails. Please create and get one approved first.` },
        { status: 400 }
      )
    }

    const emailSubject = subject || emailTemplate.subject

    // Render the appropriate template with approved body
    const html = await renderTemplate(type, {
      lead,
      interview,
      customMessage: emailTemplate.body,
    })

    // Send the email
    const result = await sendEmail({
      to: lead.email,
      subject: emailSubject,
      html,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    // Log the email
    const emailLog = await db.researchEmailLog.create({
      data: {
        leadId: lead.id,
        type,
        subject: emailSubject,
        to: lead.email,
      },
    })

    return NextResponse.json({ success: true, emailLog })
  } catch (error) {
    return handleApiError(error, 'sending research email')
  }
}

interface TemplateContext {
  lead: {
    name: string
    persona: string
    giftCardType?: string | null
  }
  interview?: {
    scheduledAt: Date | null
    duration: number | null
    calendarEventId?: string | null
  } | null
  customMessage?: string
}

async function renderTemplate(
  type: ResearchEmailType,
  ctx: TemplateContext
): Promise<string> {
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'TBD'
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    }).format(date)
  }

  switch (type) {
    case 'outreach':
      return render(
        ResearchOutreachEmail({
          leadName: ctx.lead.name,
          persona: ctx.lead.persona,
          calendarLink: CALENDAR_LINK,
          customMessage: ctx.customMessage,
        })
      )

    case 'scheduled':
      return render(
        ResearchScheduledEmail({
          leadName: ctx.lead.name,
          date: formatDate(ctx.interview?.scheduledAt),
          duration: ctx.interview?.duration || 60,
          customMessage: ctx.customMessage,
        })
      )

    case 'reminder':
      return render(
        ResearchReminderEmail({
          leadName: ctx.lead.name,
          date: formatDate(ctx.interview?.scheduledAt),
          duration: ctx.interview?.duration || 60,
          customMessage: ctx.customMessage,
        })
      )

    case 'thank_you':
      return render(
        ResearchThankYouEmail({
          leadName: ctx.lead.name,
          giftCardNote: ctx.lead.giftCardType
            ? `A ${ctx.lead.giftCardType} gift card will be sent to you separately.`
            : 'Your £30 Amazon gift card will be sent to you shortly.',
          customMessage: ctx.customMessage,
        })
      )

    case 'referral':
      return render(
        ResearchReferralEmail({
          leadName: ctx.lead.name,
          customMessage: ctx.customMessage,
        })
      )
  }
}
