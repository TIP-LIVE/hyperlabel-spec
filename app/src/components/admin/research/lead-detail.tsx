'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Building2,
  User,
  Mail,
  Linkedin,
  ChevronDown,
  Pencil,
  Trash2,
  Star,
  CalendarClock,
  Clock,
  Play,
} from 'lucide-react'
import { ScheduleInterviewDialog } from './schedule-interview-dialog'
import { SendEmailDialog } from './send-email-dialog'
import { ResearchBreadcrumb } from './research-breadcrumb'
import {
  researchLeadStatusStyles,
  researchLeadStatusConfig,
  researchPersonaStyles,
  researchPersonaConfig,
  type ResearchLeadStatus,
  type ResearchPersona,
} from '@/lib/status-config'

const ALL_STATUSES: ResearchLeadStatus[] = [
  'SOURCED', 'CONTACTED', 'SCREENED', 'SCHEDULED',
  'COMPLETED', 'ANALYSED', 'DECLINED', 'NO_SHOW',
]

interface Task {
  id: string
  title: string
  status: string
  category: string
  dueDate: string | null
  createdAt: string
}

interface Interview {
  id: string
  scheduledAt: string | null
  completedAt: string | null
  duration: number | null
  status: string
  calendarEventId: string | null
  createdAt: string
}

interface EmailLog {
  id: string
  type: string
  subject: string
  to: string
  sentAt: string
}

interface LeadData {
  id: string
  name: string
  email: string | null
  linkedIn: string | null
  company: string | null
  role: string | null
  persona: string
  status: string
  source: string | null
  referredBy: string | null
  screeningNotes: string | null
  pilotInterest: number | null
  giftCardSent: boolean
  giftCardType: string | null
  createdAt: string
  updatedAt: string
  tasks: Task[]
  interviews: Interview[]
  emailLogs: EmailLog[]
}

interface LeadDetailProps {
  lead: LeadData
}

export function LeadDetail({ lead }: LeadDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: lead.name,
    email: lead.email || '',
    linkedIn: lead.linkedIn || '',
    company: lead.company || '',
    role: lead.role || '',
    source: lead.source || '',
    screeningNotes: lead.screeningNotes || '',
    pilotInterest: lead.pilotInterest,
  })

  async function moveLead(newStatus: string) {
    const res = await fetch(`/api/v1/admin/research/leads/${lead.id}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      startTransition(() => router.refresh())
    }
  }

  async function saveLead() {
    const res = await fetch(`/api/v1/admin/research/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })
    if (res.ok) {
      setIsEditing(false)
      startTransition(() => router.refresh())
    }
  }

  async function deleteLead() {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    const res = await fetch(`/api/v1/admin/research/leads/${lead.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      router.push('/admin/research/leads')
    }
  }

  return (
    <div className="space-y-6" style={{ opacity: isPending ? 0.6 : 1 }}>
      <ResearchBreadcrumb items={[
        { label: 'Leads', href: '/admin/research/leads' },
        { label: lead.name },
      ]} />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{lead.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[lead.role, lead.company].filter(Boolean).join(' @ ') || 'No details'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lead.email && (
            <SendEmailDialog
              leadId={lead.id}
              leadName={lead.name}
              leadEmail={lead.email}
              leadPersona={lead.persona}
            />
          )}
          {lead.email && ['SCREENED', 'SCHEDULED', 'CONTACTED'].includes(lead.status) && (
            <ScheduleInterviewDialog
              leadId={lead.id}
              leadName={lead.name}
              leadEmail={lead.email}
            />
          )}
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={deleteLead}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status + Move */}
      <div className="flex items-center gap-4">
        <Badge className={researchLeadStatusStyles[lead.status as ResearchLeadStatus]}>
          {researchLeadStatusConfig[lead.status as ResearchLeadStatus].label}
        </Badge>
        <Badge className={researchPersonaStyles[lead.persona as ResearchPersona]}>
          {researchPersonaConfig[lead.persona as ResearchPersona].label}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Move to <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ALL_STATUSES.filter((s) => s !== lead.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => moveLead(s)}>
                <Badge className={`mr-2 ${researchLeadStatusStyles[s]}`}>
                  {researchLeadStatusConfig[s].label}
                </Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input value={editData.linkedIn} onChange={(e) => setEditData({ ...editData, linkedIn: e.target.value })} />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={editData.company} onChange={(e) => setEditData({ ...editData, company: e.target.value })} />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })} />
                </div>
                <div>
                  <Label>Source</Label>
                  <Input value={editData.source} onChange={(e) => setEditData({ ...editData, source: e.target.value })} />
                </div>
                <div>
                  <Label>Pilot Interest (1-5)</Label>
                  <Select
                    value={editData.pilotInterest?.toString() || ''}
                    onValueChange={(v) => setEditData({ ...editData, pilotInterest: v ? parseInt(v) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not rated" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Low</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5 - High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Screening Notes</Label>
                  <Textarea
                    value={editData.screeningNotes}
                    onChange={(e) => setEditData({ ...editData, screeningNotes: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button onClick={saveLead}>Save Changes</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
                  </div>
                )}
                {lead.linkedIn && (
                  <div className="flex items-center gap-2 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a href={lead.linkedIn} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      LinkedIn Profile
                    </a>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{lead.company}</span>
                  </div>
                )}
                {lead.role && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{lead.role}</span>
                  </div>
                )}
                {lead.source && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Source:</span>{' '}
                    <span className="text-foreground">{lead.source}</span>
                  </div>
                )}
                {lead.pilotInterest && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">Pilot interest:</span>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < lead.pilotInterest! ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                      />
                    ))}
                  </div>
                )}
                {lead.status === 'COMPLETED' || lead.status === 'ANALYSED' ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Gift card:</span>
                    {lead.giftCardSent ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                        Sent{lead.giftCardType ? ` (${lead.giftCardType})` : ''}
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={async () => {
                          const type = prompt('Gift card type (e.g. "£30 Amazon")?', '£30 Amazon')
                          if (type === null) return
                          const res = await fetch(`/api/v1/admin/research/leads/${lead.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ giftCardSent: true, giftCardType: type || '£30 Amazon' }),
                          })
                          if (res.ok) startTransition(() => router.refresh())
                        }}
                      >
                        Mark as sent
                      </Button>
                    )}
                  </div>
                ) : lead.giftCardSent ? (
                  <div className="text-sm">
                    <Badge variant="outline">Gift card sent{lead.giftCardType ? ` (${lead.giftCardType})` : ''}</Badge>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Screening Notes (read-only when not editing) */}
        {!isEditing && lead.screeningNotes && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-card-foreground">Screening Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-foreground">{lead.screeningNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Interviews */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Interviews ({lead.interviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {lead.interviews.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No interviews yet</p>
            ) : (
              <div className="space-y-2">
                {lead.interviews.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between rounded border border-border p-2">
                    <div>
                      {interview.scheduledAt && (
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(interview.scheduledAt).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          {new Date(interview.scheduledAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      {interview.duration && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {interview.duration} minutes
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        interview.status === 'COMPLETED' ? 'secondary' :
                        interview.status === 'CANCELLED' ? 'destructive' :
                        'outline'
                      }>
                        {interview.status}
                      </Badge>
                      {['SCHEDULED', 'IN_PROGRESS'].includes(interview.status) && (
                        <Link
                          href={`/admin/research/interviews/${interview.id}`}
                          className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          <Play className="h-3 w-3" />
                          {interview.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
                        </Link>
                      )}
                      {interview.status === 'COMPLETED' && (
                        <Link
                          href={`/admin/research/interviews/${interview.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Tasks ({lead.tasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {lead.tasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {lead.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded border border-border p-2">
                    <div>
                      <p className={`text-sm font-medium ${task.status === 'DONE' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{task.category}</p>
                    </div>
                    <Badge variant={task.status === 'DONE' ? 'secondary' : 'outline'}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emails */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-card-foreground">Emails ({lead.emailLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {lead.emailLogs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No emails sent yet</p>
            ) : (
              <div className="space-y-2">
                {lead.emailLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded border border-border p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {log.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.sentAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {log.type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
