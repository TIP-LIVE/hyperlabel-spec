import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { researchPersonaStyles, researchPersonaConfig } from '@/lib/status-config'
import type { ResearchPersona } from '@/lib/status-config'
import { CalendarClock, Clock, Building2, Play, FileText } from 'lucide-react'
import { ResearchBreadcrumb } from '@/components/admin/research/research-breadcrumb'
import { formatDateTime } from '@/lib/utils/format-date'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Interviews',
  description: 'Manage research interviews',
}

export default async function InterviewsPage() {
  await requireAdmin()

  const [upcoming, past] = await Promise.all([
    db.researchInterview.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            company: true,
            role: true,
            persona: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    }),
    db.researchInterview.findMany({
      where: {
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            company: true,
            role: true,
            persona: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <div className="space-y-6">
      <ResearchBreadcrumb items={[{ label: 'Interviews' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Interviews</h1>
        <p className="text-muted-foreground">
          {upcoming.length} upcoming, {past.filter((i) => i.status === 'COMPLETED').length} completed
        </p>
      </div>

      {/* Upcoming */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Upcoming & In Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No upcoming interviews. Schedule one from a lead&apos;s detail page.
            </p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <Link
                        href={`/admin/research/leads/${interview.lead.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {interview.lead.name}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {interview.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {new Date(interview.scheduledAt).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            {new Date(interview.scheduledAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {interview.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {interview.duration}m
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
                  <div className="flex items-center gap-3">
                    <Badge className={researchPersonaStyles[interview.lead.persona as ResearchPersona]}>
                      {researchPersonaConfig[interview.lead.persona as ResearchPersona].label}
                    </Badge>
                    <Badge variant={interview.status === 'IN_PROGRESS' ? 'default' : 'outline'}>
                      {interview.status === 'IN_PROGRESS' ? 'In Progress' : 'Scheduled'}
                    </Badge>
                    <Link
                      href={`/admin/research/interviews/${interview.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Play className="h-3.5 w-3.5" />
                      {interview.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Past Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No completed interviews yet.
            </p>
          ) : (
            <div className="space-y-2">
              {past.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <Link
                      href={`/admin/research/leads/${interview.lead.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {interview.lead.name}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {interview.completedAt && (
                        <span>
                          Completed{' '}
                          {formatDateTime(interview.completedAt)}
                        </span>
                      )}
                      {interview.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {interview.duration}m
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
                  <div className="flex items-center gap-3">
                    <Badge className={researchPersonaStyles[interview.lead.persona as ResearchPersona]}>
                      {researchPersonaConfig[interview.lead.persona as ResearchPersona].label}
                    </Badge>
                    <Badge variant={interview.status === 'COMPLETED' ? 'secondary' : 'destructive'}>
                      {interview.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                    </Badge>
                    {interview.status === 'COMPLETED' && (
                      <Link
                        href={`/admin/research/interviews/${interview.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent/50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View Notes
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
