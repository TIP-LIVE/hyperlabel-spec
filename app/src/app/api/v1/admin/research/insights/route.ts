import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

interface KeyQuote {
  quote: string
  context: string
  theme: string
}

interface HypothesisSignal {
  hypothesisId: string
  signal: 'validating' | 'neutral' | 'invalidating'
  evidence: string
}

/**
 * GET /api/v1/admin/research/insights
 * Aggregated insights across all completed interviews
 */
export async function GET() {
  try {
    await requireAdmin()

    const [hypotheses, completedInterviews, allLeads] = await Promise.all([
      db.researchHypothesis.findMany({ orderBy: { code: 'asc' } }),
      db.researchInterview.findMany({
        where: { status: 'COMPLETED' },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              company: true,
              persona: true,
              pilotInterest: true,
              status: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      }),
      db.researchLead.findMany({
        select: {
          id: true,
          name: true,
          company: true,
          persona: true,
          pilotInterest: true,
          status: true,
        },
      }),
    ])

    // Aggregate quotes from all completed interviews
    const quotes: Array<KeyQuote & { leadName: string; leadCompany: string | null; persona: string; interviewId: string; completedAt: Date | null }> = []
    const allSignals: Array<HypothesisSignal & { leadName: string; persona: string; interviewId: string }> = []

    for (const interview of completedInterviews) {
      const keyQuotes = (interview.keyQuotes as KeyQuote[] | null) ?? []
      const signals = (interview.hypothesisSignals as HypothesisSignal[] | null) ?? []

      for (const q of keyQuotes) {
        quotes.push({
          ...q,
          leadName: interview.lead.name,
          leadCompany: interview.lead.company,
          persona: interview.lead.persona,
          interviewId: interview.id,
          completedAt: interview.completedAt,
        })
      }

      for (const s of signals) {
        allSignals.push({
          ...s,
          leadName: interview.lead.name,
          persona: interview.lead.persona,
          interviewId: interview.id,
        })
      }
    }

    // Pain points: count themes from key quotes
    const themeCounts: Record<string, { count: number; personas: Set<string> }> = {}
    for (const q of quotes) {
      const theme = q.theme || 'uncategorized'
      if (!themeCounts[theme]) {
        themeCounts[theme] = { count: 0, personas: new Set() }
      }
      themeCounts[theme].count++
      themeCounts[theme].personas.add(q.persona)
    }

    const painPoints = Object.entries(themeCounts)
      .map(([theme, { count, personas }]) => ({
        theme,
        count,
        personas: Array.from(personas),
      }))
      .sort((a, b) => b.count - a.count)

    // Persona summaries
    const personaSummaries = (['CONSIGNEE', 'FORWARDER', 'SHIPPER'] as const).map((persona) => {
      const leads = allLeads.filter((l) => l.persona === persona)
      const interviews = completedInterviews.filter((i) => i.lead.persona === persona)
      const pilotScores = leads.map((l) => l.pilotInterest).filter((s): s is number => s !== null && s > 0)
      const personaQuotes = quotes.filter((q) => q.persona === persona)
      const personaThemes: Record<string, number> = {}
      for (const q of personaQuotes) {
        const theme = q.theme || 'uncategorized'
        personaThemes[theme] = (personaThemes[theme] || 0) + 1
      }
      const topThemes = Object.entries(personaThemes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme, count]) => ({ theme, count }))

      return {
        persona,
        leadCount: leads.length,
        interviewCount: interviews.length,
        completedCount: leads.filter((l) => l.status === 'COMPLETED' || l.status === 'ANALYSED').length,
        avgPilotInterest: pilotScores.length > 0
          ? Math.round((pilotScores.reduce((a, b) => a + b, 0) / pilotScores.length) * 10) / 10
          : null,
        topThemes,
      }
    })

    // Pilot leaderboard
    const pilotLeaderboard = allLeads
      .filter((l) => l.pilotInterest !== null && l.pilotInterest > 0)
      .sort((a, b) => (b.pilotInterest ?? 0) - (a.pilotInterest ?? 0))

    // Hypothesis signals per interview (for expandable detail)
    const hypothesisDetails = hypotheses.map((h) => {
      const signals = allSignals.filter((s) => s.hypothesisId === h.code)
      return {
        ...h,
        interviewSignals: signals,
      }
    })

    return NextResponse.json({
      hypotheses: hypothesisDetails,
      quotes,
      painPoints,
      personaSummaries,
      pilotLeaderboard,
      stats: {
        totalInterviews: completedInterviews.length,
        totalHypotheses: hypotheses.length,
        totalQuotes: quotes.length,
        leadsWithPilotInterest: pilotLeaderboard.length,
      },
    })
  } catch (error) {
    return handleApiError(error, 'fetching research insights')
  }
}
