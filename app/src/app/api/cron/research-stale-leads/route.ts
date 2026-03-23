import { withCronLogging } from '@/lib/cron'
import { db } from '@/lib/db'
import { sendEmail, isEmailConfigured } from '@/lib/email'

const RESEARCHER_EMAIL = process.env.RESEARCHER_EMAIL || 'denys@tip.live'
const STALE_DAYS = 7

/**
 * Weekly Monday 09:00 UTC — Alert about leads stuck in CONTACTED for >7 days.
 */
export const GET = withCronLogging('research-stale-leads', async () => {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)

  const staleLeads = await db.researchLead.findMany({
    where: {
      status: 'CONTACTED',
      updatedAt: { lt: cutoff },
    },
    orderBy: { updatedAt: 'asc' },
  })

  if (staleLeads.length === 0) {
    return { staleCount: 0, emailSent: false }
  }

  if (!isEmailConfigured()) {
    return { staleCount: staleLeads.length, emailSent: false, reason: 'email not configured' }
  }

  const leadList = staleLeads
    .map((l) => {
      const daysStale = Math.floor((Date.now() - l.updatedAt.getTime()) / (24 * 60 * 60 * 1000))
      return `- ${l.name}${l.company ? ` (${l.company})` : ''} — ${daysStale} days in CONTACTED`
    })
    .join('\n')

  const html = `
    <h2>Stale Research Leads Alert</h2>
    <p>${staleLeads.length} lead${staleLeads.length !== 1 ? 's have' : ' has'} been stuck in <strong>CONTACTED</strong> for over ${STALE_DAYS} days:</p>
    <pre>${leadList}</pre>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'}/admin/research/leads?status=CONTACTED">View on Lead Board</a></p>
  `

  const result = await sendEmail({
    to: RESEARCHER_EMAIL,
    subject: `[Research] ${staleLeads.length} stale lead${staleLeads.length !== 1 ? 's' : ''} need follow-up`,
    html,
  })

  return {
    staleCount: staleLeads.length,
    emailSent: result.success,
    leads: staleLeads.map((l) => l.name),
  }
})
