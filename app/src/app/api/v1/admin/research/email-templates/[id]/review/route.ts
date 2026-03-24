import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { reviewEmailTemplateSchema } from '@/lib/validations/research'
import { render } from '@react-email/components'
import { sendEmail } from '@/lib/email'
import { ScriptReviewRequestEmail } from '@/emails/script-review-request'
import { ScriptReviewCompleteEmail } from '@/emails/script-review-complete'

interface RouteParams {
  params: Promise<{ id: string }>
}

const CEO_EMAIL = process.env.CEO_EMAIL || 'andrii@tip.live'
const RESEARCHER_EMAIL = process.env.RESEARCHER_EMAIL || 'denys@tip.live'

const EMAIL_TYPE_LABELS: Record<string, string> = {
  outreach: 'Outreach',
  scheduled: 'Scheduled',
  reminder: 'Reminder',
  thank_you: 'Thank You',
  referral: 'Referral',
}

// Valid state transitions: currentStatus -> action -> newStatus
const VALID_TRANSITIONS: Record<string, Record<string, string>> = {
  DRAFT: { submit: 'IN_REVIEW' },
  IN_REVIEW: { approve: 'APPROVED', 'request-changes': 'DRAFT' },
  APPROVED: { archive: 'ARCHIVED' },
}

/**
 * POST /api/v1/admin/research/email-templates/[id]/review
 * Submit for review, approve, or request changes
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = reviewEmailTemplateSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { action, notes } = validated.data

    const template = await db.researchEmailTemplate.findUnique({ where: { id } })
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const transitions = VALID_TRANSITIONS[template.status]
    if (!transitions || !transitions[action]) {
      return NextResponse.json(
        { error: `Cannot ${action} a template with status "${template.status}"` },
        { status: 400 }
      )
    }

    const newStatus = transitions[action]

    const updateData: Record<string, unknown> = { status: newStatus }

    if (action === 'approve' || action === 'request-changes') {
      updateData.reviewedBy = 'Andrii Pavlov'
      updateData.reviewedAt = new Date()
      updateData.reviewNotes = notes || null
    }

    // If resubmitting after changes, clear old review notes
    if (action === 'submit') {
      updateData.reviewedBy = null
      updateData.reviewedAt = null
      updateData.reviewNotes = null
    }

    const updated = await db.researchEmailTemplate.update({
      where: { id },
      data: updateData,
    })

    const templateLabel = `${EMAIL_TYPE_LABELS[template.type] || template.type} email template`

    // Auto-create review task when submitting for review
    if (action === 'submit') {
      db.researchTask.create({
        data: {
          title: `Review email template: "${templateLabel}"`,
          category: 'REVIEW',
          status: 'TODO',
          assignee: 'Andrii',
        },
      }).catch(console.error)
    }

    // Send email notifications (non-blocking)
    // Reuse script review emails with template-appropriate title
    if (action === 'submit') {
      const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'}/admin/research/email-templates/${id}/review`
      render(
        ScriptReviewRequestEmail({
          scriptTitle: `${templateLabel} — "${template.subject}"`,
          persona: template.persona || 'ALL',
          reviewUrl,
        })
      ).then((html) => {
        sendEmail({
          to: CEO_EMAIL,
          subject: `Review requested: ${templateLabel}`,
          html,
        }).catch(console.error)
      }).catch(console.error)
    }

    if (action === 'approve' || action === 'request-changes') {
      const templateUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'}/admin/research/email-templates/${id}`
      render(
        ScriptReviewCompleteEmail({
          scriptTitle: `${templateLabel} — "${template.subject}"`,
          persona: template.persona || 'ALL',
          action: action === 'approve' ? 'approved' : 'changes-requested',
          notes: notes || undefined,
          scriptUrl: templateUrl,
        })
      ).then((html) => {
        sendEmail({
          to: RESEARCHER_EMAIL,
          subject: action === 'approve'
            ? `Email template approved: ${templateLabel}`
            : `Changes requested: ${templateLabel}`,
          html,
        }).catch(console.error)
      }).catch(console.error)
    }

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, 'reviewing email template')
  }
}
