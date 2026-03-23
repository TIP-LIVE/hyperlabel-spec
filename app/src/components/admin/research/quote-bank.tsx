'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Quote as QuoteIcon } from 'lucide-react'
import { researchPersonaStyles, researchPersonaConfig } from '@/lib/status-config'
import type { ResearchPersona } from '@/lib/status-config'

interface QuoteEntry {
  quote: string
  context: string
  theme: string
  leadName: string
  leadCompany: string | null
  persona: string
  interviewId: string
  completedAt: string | null
}

export function QuoteBank({ quotes }: { quotes: QuoteEntry[] }) {
  const [search, setSearch] = useState('')
  const [personaFilter, setPersonaFilter] = useState<string | null>(null)
  const [themeFilter, setThemeFilter] = useState<string | null>(null)

  const themes = useMemo(() => {
    const set = new Set(quotes.map((q) => q.theme).filter(Boolean))
    return Array.from(set).sort()
  }, [quotes])

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (search && !q.quote.toLowerCase().includes(search.toLowerCase())) return false
      if (personaFilter && q.persona !== personaFilter) return false
      if (themeFilter && q.theme !== themeFilter) return false
      return true
    })
  }, [quotes, search, personaFilter, themeFilter])

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">
          Quote Bank
          <span className="ml-2 text-sm font-normal text-muted-foreground">({quotes.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(['CONSIGNEE', 'FORWARDER', 'SHIPPER'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPersonaFilter(personaFilter === p ? null : p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                personaFilter === p
                  ? researchPersonaStyles[p]
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {researchPersonaConfig[p].label}
            </button>
          ))}
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => setThemeFilter(themeFilter === t ? null : t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                themeFilter === t
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Quotes */}
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {quotes.length === 0 ? 'No quotes captured yet' : 'No quotes match your filters'}
          </p>
        ) : (
          <div className="max-h-[500px] space-y-3 overflow-y-auto">
            {filtered.map((q, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <QuoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm italic text-foreground">&ldquo;{q.quote}&rdquo;</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {q.leadName}
                    {q.leadCompany && <span className="text-muted-foreground"> @ {q.leadCompany}</span>}
                  </span>
                  <Badge className={researchPersonaStyles[q.persona as ResearchPersona] ?? ''}>
                    {researchPersonaConfig[q.persona as ResearchPersona]?.label ?? q.persona}
                  </Badge>
                  {q.theme && (
                    <Badge variant="outline" className="text-xs">
                      {q.theme}
                    </Badge>
                  )}
                  {q.context && (
                    <span className="text-xs text-muted-foreground">{q.context}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
