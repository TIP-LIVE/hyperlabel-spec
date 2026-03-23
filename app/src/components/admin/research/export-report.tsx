'use client'

import { Download } from 'lucide-react'

interface ExportData {
  hypotheses: Array<{
    code: string
    statement: string
    successSignal: string
    validating: number
    neutral: number
    invalidating: number
    verdict: string | null
  }>
  quotes: Array<{
    quote: string
    context: string
    theme: string
    leadName: string
    leadCompany: string | null
    persona: string
  }>
  painPoints: Array<{
    theme: string
    count: number
    personas: string[]
  }>
  personaSummaries: Array<{
    persona: string
    leadCount: number
    interviewCount: number
    completedCount: number
    avgPilotInterest: number | null
    topThemes: Array<{ theme: string; count: number }>
  }>
  pilotLeaderboard: Array<{
    name: string
    company: string | null
    persona: string
    pilotInterest: number | null
    status: string
  }>
  stats: {
    totalInterviews: number
    totalHypotheses: number
    totalQuotes: number
    leadsWithPilotInterest: number
  }
}

function generateMarkdown(data: ExportData): string {
  const lines: string[] = []
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  lines.push(`# TIP Research Report`)
  lines.push(`_Generated: ${date}_`)
  lines.push('')

  // Executive Summary
  lines.push(`## Executive Summary`)
  lines.push('')
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Interviews Completed | ${data.stats.totalInterviews} |`)
  lines.push(`| Hypotheses Tested | ${data.stats.totalHypotheses} |`)
  lines.push(`| Key Quotes Captured | ${data.stats.totalQuotes} |`)
  lines.push(`| Leads with Pilot Interest | ${data.stats.leadsWithPilotInterest} |`)
  lines.push('')

  // Hypothesis Results
  lines.push(`## Hypothesis Results`)
  lines.push('')
  for (const h of data.hypotheses) {
    const total = h.validating + h.neutral + h.invalidating
    const verdictLabel = h.verdict ? ` — **${h.verdict}**` : ''
    lines.push(`### ${h.code}: ${h.statement}${verdictLabel}`)
    lines.push(`- Success signal: ${h.successSignal}`)
    if (total > 0) {
      lines.push(`- Validating: ${h.validating} | Neutral: ${h.neutral} | Invalidating: ${h.invalidating}`)
    } else {
      lines.push(`- No signals collected yet`)
    }
    lines.push('')
  }

  // Pain Points
  if (data.painPoints.length > 0) {
    lines.push(`## Pain Points (by frequency)`)
    lines.push('')
    for (const p of data.painPoints) {
      lines.push(`${p.count}. **${p.theme}** (${p.personas.join(', ')})`)
    }
    lines.push('')
  }

  // Persona Profiles
  lines.push(`## Persona Profiles`)
  lines.push('')
  for (const s of data.personaSummaries) {
    lines.push(`### ${s.persona}`)
    lines.push(`- Leads: ${s.leadCount} | Interviews: ${s.interviewCount} | Completed: ${s.completedCount}`)
    if (s.avgPilotInterest !== null) {
      lines.push(`- Average pilot interest: ${s.avgPilotInterest}/5`)
    }
    if (s.topThemes.length > 0) {
      lines.push(`- Top themes: ${s.topThemes.map((t) => `${t.theme} (${t.count})`).join(', ')}`)
    }
    lines.push('')
  }

  // Key Quotes
  if (data.quotes.length > 0) {
    lines.push(`## Key Quotes`)
    lines.push('')
    for (const q of data.quotes) {
      const attribution = [q.leadName, q.leadCompany].filter(Boolean).join(' @ ')
      lines.push(`> "${q.quote}"`)
      lines.push(`> — ${attribution} (${q.persona})${q.theme ? ` [${q.theme}]` : ''}`)
      lines.push('')
    }
  }

  // Pilot Candidates
  if (data.pilotLeaderboard.length > 0) {
    lines.push(`## Pilot Candidates`)
    lines.push('')
    lines.push(`| Rank | Name | Company | Persona | Interest | Status |`)
    lines.push(`|------|------|---------|---------|----------|--------|`)
    data.pilotLeaderboard.forEach((l, i) => {
      lines.push(`| ${i + 1} | ${l.name} | ${l.company ?? '—'} | ${l.persona} | ${'★'.repeat(l.pilotInterest ?? 0)}${'☆'.repeat(5 - (l.pilotInterest ?? 0))} | ${l.status} |`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

export function ExportReport({ data }: { data: ExportData }) {
  const handleExport = () => {
    const markdown = generateMarkdown(data)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tip-research-report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
    >
      <Download className="h-4 w-4" />
      Export Report
    </button>
  )
}
