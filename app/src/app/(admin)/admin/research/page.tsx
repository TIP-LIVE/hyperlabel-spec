import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { Users, UserCheck, CalendarClock, CheckCircle, ClipboardList, ArrowRight } from 'lucide-react'
import { researchLeadStatusStyles, researchPersonaStyles, researchPersonaConfig } from '@/lib/status-config'
import type { ResearchLeadStatus, ResearchPersona } from '@/lib/status-config'
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
  ])

  const [consigneeCount, forwarderCount, shipperCount] = personaCounts

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
        <Link
          href="/admin/research/leads"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ClipboardList className="h-4 w-4" />
          Lead Board
        </Link>
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
