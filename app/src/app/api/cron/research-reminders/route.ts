import { withCronLogging } from '@/lib/cron'
import { db } from '@/lib/db'
import { render } from '@react-email/components'
import { sendEmail } from '@/lib/email'
import { ResearchReminderEmail } from '@/emails/research-reminder'

/**
 * Daily 08:00 UTC — Send reminder emails for interviews scheduled within the next 24-28 hours.
 * The 4-hour window accounts for the daily run interval so no interviews are missed.
 */
export const GET = withCronLogging('research-reminders', async () => {
  const now = new Date()
  const from = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24h from now
  const to = new Date(now.getTime() + 28 * 60 * 60 * 1000) // 28h from now

  // Find interviews scheduled in the 24-28h window
  const interviews = await db.researchInterview.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { gte: from, lte: to },
    },
    include: {
      lead: {
        include: {
          emailLogs: {
            where: { type: 'reminder' },
            orderBy: { sentAt: 'desc' },
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

    // Skip if no email
    if (!lead.email) {
      skipped++
      continue
    }

    // Skip if reminder already sent for this interview (check if any reminder was sent after interview was scheduled)
    const lastReminder = lead.emailLogs[0]
    if (lastReminder && interview.scheduledAt && lastReminder.sentAt >= interview.createdAt) {
      skipped++
      continue
    }

    const date = interview.scheduledAt
      ? new Intl.DateTimeFormat('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/London',
        }).format(interview.scheduledAt)
      : 'TBD'

    const html = await render(
      ResearchReminderEmail({
        leadName: lead.name,
        date,
        duration: interview.duration || 60,
      })
    )

    const result = await sendEmail({
      to: lead.email,
      subject: 'Reminder: Your interview with TIP is tomorrow',
      html,
    })

    if (result.success) {
      await db.researchEmailLog.create({
        data: {
          leadId: lead.id,
          type: 'reminder',
          subject: 'Reminder: Your interview with TIP is tomorrow',
          to: lead.email,
        },
      })
      sent++
    } else {
      console.error(`[research-reminders] Failed to send to ${lead.email}:`, result.error)
      skipped++
    }
  }

  return { found: interviews.length, sent, skipped }
})
