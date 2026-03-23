import { withCronLogging } from '@/lib/cron'
import { db } from '@/lib/db'
import { render } from '@react-email/components'
import { sendEmail } from '@/lib/email'
import { ResearchReferralEmail } from '@/emails/research-referral'

/**
 * Daily 09:30 UTC — Send referral request emails ~48 hours after interview completion.
 * Window: 44-52 hours after completedAt. Only sends if no referral email already sent.
 */
export const GET = withCronLogging('research-referral', async () => {
  const now = new Date()
  const from = new Date(now.getTime() - 52 * 60 * 60 * 1000) // 52h ago
  const to = new Date(now.getTime() - 44 * 60 * 60 * 1000) // 44h ago

  // Find interviews completed around 48h ago
  const interviews = await db.researchInterview.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: from, lte: to },
    },
    include: {
      lead: {
        include: {
          emailLogs: {
            where: { type: 'referral' },
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

    // Skip if no email or referral already sent
    if (!lead.email || lead.emailLogs.length > 0) {
      skipped++
      continue
    }

    const html = await render(
      ResearchReferralEmail({
        leadName: lead.name,
      })
    )

    const result = await sendEmail({
      to: lead.email,
      subject: "Know someone in logistics? We'd love an introduction",
      html,
    })

    if (result.success) {
      await db.researchEmailLog.create({
        data: {
          leadId: lead.id,
          type: 'referral',
          subject: "Know someone in logistics? We'd love an introduction",
          to: lead.email,
        },
      })
      sent++
    } else {
      console.error(`[research-referral] Failed to send to ${lead.email}:`, result.error)
      skipped++
    }
  }

  return { found: interviews.length, sent, skipped }
})
