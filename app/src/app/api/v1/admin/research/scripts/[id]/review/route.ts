import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { reviewScriptSchema } from '@/lib/validations/research'
import { render } from '@react-email/components'
import { sendEmail } from '@/lib/email'
import { ScriptReviewRequestEmail } from '@/emails/script-review-request'
import { ScriptReviewCompleteEmail } from '@/emails/script-review-complete'

interface RouteParams {
  params: Promise<{ id: string }>
}

const CEO_EMAIL = process.env.CEO_EMAIL || 'andrii@tip.live'
const RESEARCHER_EMAIL = process.env.RESEARCHER_EMAIL || 'denys@tip.live'

// Valid state transitions: currentStatus -> action -> newStatus
const VALID_TRANSITIONS: Record<string, Record<string, string>> = {
  DRAFT: { submit: 'IN_REVIEW' },
  IN_REVIEW: { approve: 'APPROVED', 'request-changes': 'DRAFT' },
  APPROVED: { archive: 'ARCHIVED' },
}

/**
 * POST /api/v1/admin/research/scripts/[id]/review
 * Submit for review, approve, or request changes
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = reviewScriptSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { action, notes } = validated.data

    const script = await db.researchScript.findUnique({ where: { id } })
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const transitions = VALID_TRANSITIONS[script.status]
    if (!transitions || !transitions[action]) {
      return NextResponse.json(
        { error: `Cannot ${action} a script with status "${script.status}"` },
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

    const updated = await db.researchScript.update({
      where: { id },
      data: updateData,
    })

    // Auto-create review task when submitting for review
    if (action === 'submit') {
      db.researchTask.create({
        data: {
          title: `Review script: "${script.title}"`,
          category: 'REVIEW',
          status: 'TODO',
          assignee: 'Andrii',
        },
      }).catch(console.error)
    }

    // Send email notifications (non-blocking)
    if (action === 'submit') {
      const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'}/admin/research/scripts/${id}/review`
      render(
        ScriptReviewRequestEmail({
          scriptTitle: script.title,
          persona: script.persona,
          reviewUrl,
        })
      ).then((html) => {
        sendEmail({
          to: CEO_EMAIL,
          subject: `Review requested: "${script.title}" interview script`,
          html,
        }).catch(console.error)
      }).catch(console.error)
    }

    if (action === 'approve' || action === 'request-changes') {
      const scriptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'}/admin/research/scripts/${id}`
      render(
        ScriptReviewCompleteEmail({
          scriptTitle: script.title,
          persona: script.persona,
          action: action === 'approve' ? 'approved' : 'changes-requested',
          notes: notes || undefined,
          scriptUrl,
        })
      ).then((html) => {
        sendEmail({
          to: RESEARCHER_EMAIL,
          subject: action === 'approve'
            ? `✅ Script approved: "${script.title}"`
            : `📝 Changes requested: "${script.title}"`,
          html,
        }).catch(console.error)
      }).catch(console.error)
    }

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, 'reviewing research script')
  }
}
