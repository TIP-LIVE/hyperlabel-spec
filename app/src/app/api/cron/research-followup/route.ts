import { withCronLogging } from '@/lib/cron'
import { db } from '@/lib/db'
import { render } from '@react-email/components'
import { sendEmail } from '@/lib/email'
import { ResearchThankYouEmail } from '@/emails/research-thank-you'

/**
 * Daily 09:00 UTC — Send thank-you emails for interviews completed in the last 24-28 hours.
 * Only sends if no thank_you email has already been sent to that lead.
 */
export const GET = withCronLogging('research-followup', async () => {
  const now = new Date()
  const from = new Date(now.getTime() - 28 * 60 * 60 * 1000) // 28h ago
  const to = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24h ago

  // Find recently completed interviews
  const interviews = await db.researchInterview.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: from, lte: to },
    },
    include: {
      lead: {
        include: {
          emailLogs: {
            where: { type: 'thank_you' },
            take: 1,
          },
        },
      },
    },
  })

  let sent = 0
  let skipped = 0

  for (const interview of interviews) {
    const { lead } = interview

    // Skip if no email or thank-you already sent
    if (!lead.email || lead.emailLogs.length > 0) {
      skipped++
      continue
    }

    const giftCardNote = lead.giftCardType
      ? `A ${lead.giftCardType} gift card will be sent to you separately.`
      : 'Your £30 Amazon gift card will be sent to you shortly.'

    const html = await render(
      ResearchThankYouEmail({
        leadName: lead.name,
        giftCardNote,
      })
    )

    const result = await sendEmail({
      to: lead.email,
      subject: 'Thank you for your time — TIP Research',
      html,
    })

    if (result.success) {
      await db.researchEmailLog.create({
        data: {
          leadId: lead.id,
          type: 'thank_you',
          subject: 'Thank you for your time — TIP Research',
          to: lead.email,
        },
      })
      sent++
    } else {
      console.error(`[research-followup] Failed to send to ${lead.email}:`, result.error)
      skipped++
    }
  }

  return { found: interviews.length, sent, skipped }
})
