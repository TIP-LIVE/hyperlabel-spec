'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, User, Building2, XCircle, CalendarX } from 'lucide-react'
import { researchPersonaStyles, researchPersonaConfig, type ResearchPersona } from '@/lib/status-config'

interface InterviewLead {
  id: string
  name: string
  email: string | null
  company: string | null
  role: string | null
  persona: string
  status: string
}

interface Interview {
  id: string
  scheduledAt: string | null
  duration: number | null
  status: string
  calendarEventId: string | null
  lead: InterviewLead
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupByDate(interviews: Interview[]): Record<string, Interview[]> {
  const groups: Record<string, Interview[]> = {}
  for (const interview of interviews) {
    if (!interview.scheduledAt) continue
    const dateKey = new Date(interview.scheduledAt).toISOString().split('T')[0]
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(interview)
  }
  return groups
}

export function CalendarView() {
  const router = useRouter()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)

  const fetchInterviews = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (showPast) params.set('past', 'true')
      const res = await fetch(`/api/v1/admin/research/calendar/events?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInterviews(data.interviews)
      }
    } catch (err) {
      console.error('Failed to fetch interviews:', err)
    } finally {
      setLoading(false)
    }
  }, [showPast])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  async function cancelInterview(id: string) {
    if (!confirm('Cancel this interview? The Google Calendar event will also be removed.')) return
    const res = await fetch(`/api/v1/admin/research/calendar/events/${id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setInterviews((prev) => prev.filter((i) => i.id !== id))
      router.refresh()
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading interviews...</p>
  }

  const grouped = groupByDate(interviews)
  const dateKeys = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowPast(!showPast); setLoading(true) }}
        >
          {showPast ? 'Hide Past' : 'Show Past'}
        </Button>
      </div>

      {dateKeys.length === 0 ? (
        <div className="py-12 text-center">
          <CalendarX className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No upcoming interviews scheduled.
          </p>
          <p className="text-sm text-muted-foreground">
            Schedule an interview from a lead&apos;s detail page.
          </p>
        </div>
      ) : (
        dateKeys.map((dateKey) => (
          <div key={dateKey}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {formatDate(grouped[dateKey][0].scheduledAt!)}
            </h3>
            <div className="space-y-2">
              {grouped[dateKey].map((interview) => (
                <Card key={interview.id} className="border-border bg-card">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">
                          {formatTime(interview.scheduledAt!)}
                        </p>
                        {interview.duration && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {interview.duration}m
                          </p>
                        )}
                      </div>

                      <div className="border-l border-border pl-4">
                        <Link
                          href={`/admin/research/leads/${interview.lead.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {interview.lead.name}
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {interview.lead.role && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {interview.lead.role}
                            </span>
                          )}
                          {interview.lead.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {interview.lead.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={researchPersonaStyles[interview.lead.persona as ResearchPersona]}>
                        {researchPersonaConfig[interview.lead.persona as ResearchPersona].label}
                      </Badge>
                      {interview.status === 'CANCELLED' ? (
                        <Badge variant="secondary" className="text-destructive">
                          Cancelled
                        </Badge>
                      ) : interview.status === 'COMPLETED' ? (
                        <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                          Completed
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => cancelInterview(interview.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
