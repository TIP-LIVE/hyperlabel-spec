import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Star, MessageSquare } from 'lucide-react'
import { researchPersonaStyles, researchPersonaConfig } from '@/lib/status-config'
import type { ResearchPersona } from '@/lib/status-config'

interface PersonaSummaryData {
  persona: string
  leadCount: number
  interviewCount: number
  completedCount: number
  avgPilotInterest: number | null
  topThemes: Array<{ theme: string; count: number }>
}

export function PersonaSummaries({ summaries }: { summaries: PersonaSummaryData[] }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground">Persona Summaries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaries.map((s) => (
          <div key={s.persona} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={researchPersonaStyles[s.persona as ResearchPersona]}>
                {researchPersonaConfig[s.persona as ResearchPersona]?.label ?? s.persona}
              </Badge>
              {s.avgPilotInterest !== null && (
                <div className="flex items-center gap-1 text-sm text-foreground">
                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="font-medium">{s.avgPilotInterest}</span>
                  <span className="text-xs text-muted-foreground">avg interest</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{s.leadCount}</p>
                <p className="text-xs text-muted-foreground">Leads</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.interviewCount}</p>
                <p className="text-xs text-muted-foreground">Interviews</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>

            {s.topThemes.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Top Themes</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.topThemes.map((t) => (
                    <Badge key={t.theme} variant="outline" className="text-xs">
                      {t.theme} ({t.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
