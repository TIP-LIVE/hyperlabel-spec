import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { CheckCircle, Lightbulb, Quote, Users } from 'lucide-react'
import { ResearchBreadcrumb } from '@/components/admin/research/research-breadcrumb'
import { HypothesisScorecard } from '@/components/admin/research/hypothesis-scorecard'
import { QuoteBank } from '@/components/admin/research/quote-bank'
import { PersonaSummaries } from '@/components/admin/research/persona-summary'
import { PilotLeaderboard } from '@/components/admin/research/pilot-leaderboard'
import { ExportReport } from '@/components/admin/research/export-report'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Research Insights',
  description: 'Aggregated findings from user research interviews',
}

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

export default async function InsightsPage() {
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

  // Aggregate quotes and signals from completed interviews
  const quotes: Array<KeyQuote & { leadName: string; leadCompany: string | null; persona: string; interviewId: string; completedAt: string | null }> = []
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
        completedAt: interview.completedAt?.toISOString() ?? null,
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

  // Hypothesis details with per-interview signals — derive counts from actual data
  const hypothesisDetails = hypotheses.map((h) => {
    const signals = allSignals.filter((s) => s.hypothesisId === h.code)
    return {
      ...h,
      interviewSignals: signals,
      validating: signals.filter((s) => s.signal === 'validating').length,
      neutral: signals.filter((s) => s.signal === 'neutral').length,
      invalidating: signals.filter((s) => s.signal === 'invalidating').length,
    }
  })

  // Stats
  const stats = {
    totalInterviews: completedInterviews.length,
    totalHypotheses: hypotheses.length,
    totalQuotes: quotes.length,
    leadsWithPilotInterest: pilotLeaderboard.length,
  }

  const statCards = [
    { label: 'Interviews Completed', value: stats.totalInterviews, icon: CheckCircle },
    { label: 'Hypotheses Tested', value: stats.totalHypotheses, icon: Lightbulb },
    { label: 'Quotes Captured', value: stats.totalQuotes, icon: Quote },
    { label: 'Pilot Interest', value: stats.leadsWithPilotInterest, icon: Users },
  ]

  return (
    <div className="space-y-6">
      <ResearchBreadcrumb items={[{ label: 'Insights' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Research Insights</h1>
          <p className="text-muted-foreground">
            Aggregated findings across {stats.totalInterviews} completed interview{stats.totalInterviews !== 1 ? 's' : ''}
          </p>
        </div>
        <ExportReport data={{ hypotheses: hypothesisDetails, quotes, painPoints, personaSummaries, pilotLeaderboard, stats }} />
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hypothesis Scorecard — full width */}
      <HypothesisScorecard hypotheses={hypothesisDetails} />

      {/* Quote Bank + Pain Points */}
      <div className="grid gap-6 lg:grid-cols-2">
        <QuoteBank quotes={quotes} />

        {/* Pain Point Ranking */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Pain Point Ranking
              <span className="ml-2 text-sm font-normal text-muted-foreground">({painPoints.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {painPoints.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No pain points extracted yet — they are auto-derived from quote themes
              </p>
            ) : (
              <div className="space-y-2">
                {painPoints.map((p, i) => (
                  <div
                    key={p.theme}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">{p.theme}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {p.personas.map((persona) => (
                          <Badge key={persona} variant="outline" className="text-[10px] px-1.5 py-0">
                            {persona.slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                      <Badge variant="secondary">{p.count}x</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Persona Summaries + Pilot Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PersonaSummaries summaries={personaSummaries} />
        <PilotLeaderboard leads={pilotLeaderboard} />
      </div>
    </div>
  )
}
