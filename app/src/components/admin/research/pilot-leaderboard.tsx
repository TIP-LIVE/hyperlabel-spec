import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'
import { researchPersonaStyles, researchPersonaConfig, researchLeadStatusStyles } from '@/lib/status-config'
import type { ResearchPersona, ResearchLeadStatus } from '@/lib/status-config'

interface LeadEntry {
  id: string
  name: string
  company: string | null
  persona: string
  pilotInterest: number | null
  status: string
}

export function PilotLeaderboard({ leads }: { leads: LeadEntry[] }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">Pilot Interest Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No leads with pilot interest recorded yet
          </p>
        ) : (
          <div className="space-y-2">
            {leads.map((lead, i) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    {lead.company && (
                      <p className="text-xs text-muted-foreground">{lead.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={researchPersonaStyles[lead.persona as ResearchPersona]}>
                    {researchPersonaConfig[lead.persona as ResearchPersona]?.label ?? lead.persona}
                  </Badge>
                  <Badge className={researchLeadStatusStyles[lead.status as ResearchLeadStatus]}>
                    {lead.status.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star
                        key={si}
                        className={`h-3.5 w-3.5 ${
                          si < (lead.pilotInterest ?? 0)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
