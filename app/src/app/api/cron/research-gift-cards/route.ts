import { withCronLogging } from '@/lib/cron'
import { db } from '@/lib/db'
import { sendEmail, isEmailConfigured } from '@/lib/email'

const RESEARCHER_EMAIL = process.env.RESEARCHER_EMAIL || 'denys@tip.live'

/**
 * Daily 11:00 UTC — Remind admin about pending gift cards for completed interviews.
 */
export const GET = withCronLogging('research-gift-cards', async () => {
  const pendingLeads = await db.researchLead.findMany({
    where: {
      status: { in: ['COMPLETED', 'ANALYSED'] },
      giftCardSent: false,
    },
    include: {
      interviews: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'asc' },
  })

  if (pendingLeads.length === 0) {
    return { pendingCount: 0, emailSent: false }
  }

  if (!isEmailConfigured()) {
    return { pendingCount: pendingLeads.length, emailSent: false, reason: 'email not configured' }
  }

  const leadList = pendingLeads
    .map((l) => {
      const completedAt = l.interviews[0]?.completedAt
      const daysAgo = completedAt
        ? Math.floor((Date.now() - new Date(completedAt).getTime()) / (24 * 60 * 60 * 1000))
        : '?'
      return `- ${l.name}${l.company ? ` (${l.company})` : ''} — completed ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`
    })
    .join('\n')

  const html = `
    <h2>Gift Cards Pending</h2>
    <p>${pendingLeads.length} completed interview${pendingLeads.length !== 1 ? 's' : ''} still need gift cards:</p>
    <pre>${leadList}</pre>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'}/admin/research/leads?status=COMPLETED">View Completed Leads</a></p>
  `

  const result = await sendEmail({
    to: RESEARCHER_EMAIL,
    subject: `[Research] ${pendingLeads.length} gift card${pendingLeads.length !== 1 ? 's' : ''} pending`,
    html,
  })

  return {
    pendingCount: pendingLeads.length,
    emailSent: result.success,
    leads: pendingLeads.map((l) => l.name),
  }
})
