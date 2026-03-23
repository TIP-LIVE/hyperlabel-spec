import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { Users, UserCheck, CalendarClock, CheckCircle, ClipboardList, FileText, ArrowRight, Check, Minus, X } from 'lucide-react'
import { researchLeadStatusStyles, researchPersonaStyles, researchPersonaConfig, scriptStatusStyles, scriptStatusConfig } from '@/lib/status-config'
import type { ResearchLeadStatus, ResearchPersona, ScriptStatus } from '@/lib/status-config'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Research Hub',
  description: 'Manage user research interviews',
}

export default async function ResearchDashboardPage() {
  await requireAdmin()

  const [
    totalLeads,
    sourcedCount,
    contactedCount,
    screenedCount,
    scheduledCount,
    completedCount,
    analysedCount,
    declinedCount,
    noShowCount,
    personaCounts,
    pendingTasks,
    recentLeads,
    scriptCounts,
    hypotheses,
  ] = await Promise.all([
    db.researchLead.count(),
    db.researchLead.count({ where: { status: 'SOURCED' } }),
    db.researchLead.count({ where: { status: 'CONTACTED' } }),
    db.researchLead.count({ where: { status: 'SCREENED' } }),
    db.researchLead.count({ where: { status: 'SCHEDULED' } }),
    db.researchLead.count({ where: { status: 'COMPLETED' } }),
    db.researchLead.count({ where: { status: 'ANALYSED' } }),
    db.researchLead.count({ where: { status: 'DECLINED' } }),
    db.researchLead.count({ where: { status: 'NO_SHOW' } }),
    Promise.all([
      db.researchLead.count({ where: { persona: 'CONSIGNEE' } }),
      db.researchLead.count({ where: { persona: 'FORWARDER' } }),
      db.researchLead.count({ where: { persona: 'SHIPPER' } }),
    ]),
    db.researchTask.count({ where: { status: 'TODO' } }),
    db.researchLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    Promise.all([
      db.researchScript.count({ where: { status: 'DRAFT' } }),
      db.researchScript.count({ where: { status: 'IN_REVIEW' } }),
      db.researchScript.count({ where: { status: 'APPROVED' } }),
    ]),
    db.researchHypothesis.findMany({
      orderBy: { code: 'asc' },
    }),
  ])

  const [consigneeCount, forwarderCount, shipperCount] = personaCounts
  const [draftScripts, inReviewScripts, approvedScripts] = scriptCounts

  const stats = [
    { label: 'Total Leads', value: totalLeads, icon: Users, href: '/admin/research/leads' },
    { label: 'Contacted', value: contactedCount, icon: UserCheck, href: '/admin/research/leads?status=CONTACTED' },
    { label: 'Scheduled', value: scheduledCount, icon: CalendarClock, href: '/admin/research/leads?status=SCHEDULED' },
    { label: 'Completed', value: completedCount, icon: CheckCircle, href: '/admin/research/leads?status=COMPLETED' },
  ]

  const pipelineStages: { status: ResearchLeadStatus; count: number }[] = [
    { status: 'SOURCED', count: sourcedCount },
    { status: 'CONTACTED', count: contactedCount },
    { status: 'SCREENED', count: screenedCount },
    { status: 'SCHEDULED', count: scheduledCount },
    { status: 'COMPLETED', count: completedCount },
    { status: 'ANALYSED', count: analysedCount },
  ]

  const personas: { persona: ResearchPersona; count: number }[] = [
    { persona: 'CONSIGNEE', count: consigneeCount },
    { persona: 'FORWARDER', count: forwarderCount },
    { persona: 'SHIPPER', count: shipperCount },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Research Hub</h1>
          <p className="text-muted-foreground">
            User research interview pipeline — target: 15-20 interviews across 3 personas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/research/scripts"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50"
          >
            <FileText className="h-4 w-4" />
            Scripts
          </Link>
          <Link
            href="/admin/research/leads"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ClipboardList className="h-4 w-4" />
            Lead Board
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="border-border bg-card transition-colors hover:bg-accent/50">
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
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {totalLeads === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No leads yet.{' '}
                <Link href="/admin/research/leads/new" className="text-primary hover:underline">
                  Add your first lead
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {pipelineStages.map(({ status, count }) => (
                  <div key={status} className="flex items-center gap-3">
                    <Badge className={researchLeadStatusStyles[status]}>
                      {status.replace('_', ' ')}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: totalLeads > 0 ? `${(count / totalLeads) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">{count}</span>
                  </div>
                ))}
                {(declinedCount > 0 || noShowCount > 0) && (
                  <div className="border-t border-border pt-3">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {declinedCount > 0 && <span>Declined: {declinedCount}</span>}
                      {noShowCount > 0 && <span>No-show: {noShowCount}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Persona Breakdown */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">By Persona</CardTitle>
          </CardHeader>
          <CardContent>
            {totalLeads === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No leads yet</p>
            ) : (
              <div className="space-y-4">
                {personas.map(({ persona, count }) => (
                  <div key={persona} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={researchPersonaStyles[persona]}>
                        {researchPersonaConfig[persona].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">{count}</span>
                      <span className="text-sm text-muted-foreground">/ 5-7 target</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scripts */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-card-foreground">Interview Scripts</CardTitle>
            <Link href="/admin/research/scripts" className="text-sm text-primary hover:underline">
              View all <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { status: 'DRAFT' as ScriptStatus, count: draftScripts },
                { status: 'IN_REVIEW' as ScriptStatus, count: inReviewScripts },
                { status: 'APPROVED' as ScriptStatus, count: approvedScripts },
              ].map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge className={scriptStatusStyles[status]}>
                    {scriptStatusConfig[status].label}
                  </Badge>
                  <span className="text-lg font-bold text-foreground">{count}</span>
                </div>
              ))}
              {inReviewScripts > 0 && (
                <div className="border-t border-border pt-3">
                  <Link
                    href="/admin/research/scripts?status=IN_REVIEW"
                    className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
                  >
                    {inReviewScripts} script{inReviewScripts !== 1 ? 's' : ''} awaiting review
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hypotheses */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Hypotheses</CardTitle>
          </CardHeader>
          <CardContent>
            {hypotheses.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No hypotheses yet</p>
            ) : (
              <div className="space-y-3">
                {hypotheses.map((h) => {
                  const total = h.validating + h.neutral + h.invalidating
                  return (
                    <div key={h.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {h.code}
                          </Badge>
                          <span className="text-sm text-foreground line-clamp-1">
                            {h.statement}
                          </span>
                        </div>
                      </div>
                      {total > 0 ? (
                        <div className="flex items-center gap-2 pl-12">
                          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
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
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {h.validating}
                            <Check className="inline h-2.5 w-2.5 text-green-500 mx-0.5" />
                            {h.neutral}
                            <Minus className="inline h-2.5 w-2.5 text-gray-400 mx-0.5" />
                            {h.invalidating}
                            <X className="inline h-2.5 w-2.5 text-red-500 mx-0.5" />
                          </span>
                        </div>
                      ) : (
                        <p className="pl-12 text-xs text-muted-foreground">No signals yet</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-card-foreground">Recent Leads</CardTitle>
            <Link href="/admin/research/leads" className="text-sm text-primary hover:underline">
              View all <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No leads yet.{' '}
                <Link href="/admin/research/leads/new" className="text-primary hover:underline">
                  Add one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/admin/research/leads/${lead.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {[lead.role, lead.company].filter(Boolean).join(' @ ') || 'No details'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={researchPersonaStyles[lead.persona as ResearchPersona]}>
                        {researchPersonaConfig[lead.persona as ResearchPersona].label}
                      </Badge>
                      <Badge className={researchLeadStatusStyles[lead.status as ResearchLeadStatus]}>
                        {lead.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Overview */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-3xl font-bold text-foreground">{pendingTasks}</p>
                <p className="text-sm text-muted-foreground">Pending tasks</p>
              </div>
              <p className="text-sm text-muted-foreground">Task board coming in Week 7</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
