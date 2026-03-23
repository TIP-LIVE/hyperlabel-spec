'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Minus, X, ChevronDown, ChevronUp, Quote } from 'lucide-react'

interface InterviewSignal {
  hypothesisId: string
  signal: 'validating' | 'neutral' | 'invalidating'
  evidence: string
  leadName: string
  persona: string
  interviewId: string
}

interface Hypothesis {
  id: string
  code: string
  statement: string
  successSignal: string
  validating: number
  neutral: number
  invalidating: number
  verdict: string | null
  interviewSignals: InterviewSignal[]
}

const verdictStyles: Record<string, string> = {
  VALIDATED: 'bg-green-500/20 text-green-600 dark:text-green-400',
  INVALIDATED: 'bg-red-500/20 text-red-600 dark:text-red-400',
  INCONCLUSIVE: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
}

export function HypothesisScorecard({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (hypotheses.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Hypothesis Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">No hypotheses defined yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">Hypothesis Scorecard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hypotheses.map((h) => {
          const total = h.validating + h.neutral + h.invalidating
          const isExpanded = expanded[h.id]

          return (
            <div key={h.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0 font-mono text-xs">
                      {h.code}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{h.statement}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Signal: {h.successSignal}</p>
                </div>
                {h.verdict && (
                  <Badge className={verdictStyles[h.verdict] ?? 'bg-gray-500/20 text-gray-600'}>
                    {h.verdict}
                  </Badge>
                )}
              </div>

              {total > 0 ? (
                <div className="mt-3 space-y-2">
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                    {h.validating > 0 && (
                      <div className="bg-green-500" style={{ width: `${(h.validating / total) * 100}%` }} />
                    )}
                    {h.neutral > 0 && (
                      <div className="bg-gray-400" style={{ width: `${(h.neutral / total) * 100}%` }} />
                    )}
                    {h.invalidating > 0 && (
                      <div className="bg-red-500" style={{ width: `${(h.invalidating / total) * 100}%` }} />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {h.validating}
                      <Check className="mx-0.5 inline h-3 w-3 text-green-500" />
                      {h.neutral}
                      <Minus className="mx-0.5 inline h-3 w-3 text-gray-400" />
                      {h.invalidating}
                      <X className="mx-0.5 inline h-3 w-3 text-red-500" />
                    </span>
                    {h.interviewSignals.length > 0 && (
                      <button
                        onClick={() => toggle(h.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {isExpanded ? 'Hide' : 'Show'} evidence
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No signals yet</p>
              )}

              {isExpanded && h.interviewSignals.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {h.interviewSignals.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="mt-0.5 shrink-0">
                        {s.signal === 'validating' && <Check className="h-3.5 w-3.5 text-green-500" />}
                        {s.signal === 'neutral' && <Minus className="h-3.5 w-3.5 text-gray-400" />}
                        {s.signal === 'invalidating' && <X className="h-3.5 w-3.5 text-red-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{s.leadName}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{s.persona}</Badge>
                        </div>
                        {s.evidence && (
                          <p className="mt-0.5 text-muted-foreground">
                            <Quote className="mr-1 inline h-2.5 w-2.5" />
                            {s.evidence}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
