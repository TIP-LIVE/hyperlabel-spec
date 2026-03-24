'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Plus, Mail } from 'lucide-react'
import { ResearchBreadcrumb } from './research-breadcrumb'
import {
  scriptStatusConfig,
  scriptStatusStyles,
  researchPersonaConfig,
  researchPersonaStyles,
  type ScriptStatus,
  type ResearchPersona,
} from '@/lib/status-config'

const EMAIL_TYPE_LABELS: Record<string, string> = {
  outreach: 'Outreach',
  scheduled: 'Scheduled',
  reminder: 'Reminder',
  thank_you: 'Thank You',
  referral: 'Referral',
}

const EMAIL_TYPE_DESCRIPTIONS: Record<string, string> = {
  outreach: 'Initial research invitation',
  scheduled: 'Interview confirmation',
  reminder: '24h before interview',
  thank_you: 'Post-interview thanks + gift card',
  referral: 'Referral request (48h after)',
}

interface TemplateData {
  id: string
  type: string
  persona: ResearchPersona | null
  subject: string
  body: string
  status: ScriptStatus
  version: number
  reviewedBy: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

interface EmailTemplateListProps {
  templates: TemplateData[]
}

const EMAIL_TYPES = ['outreach', 'scheduled', 'reminder', 'thank_you', 'referral']
const STATUSES: ScriptStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED']

export function EmailTemplateList({ templates }: EmailTemplateListProps) {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = templates.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    return true
  })

  const grouped = EMAIL_TYPES.reduce(
    (acc, type) => {
      const items = filtered.filter((t) => t.type === type)
      if (items.length > 0) acc[type] = items
      return acc
    },
    {} as Record<string, TemplateData[]>
  )

  return (
    <div className="space-y-6">
      <ResearchBreadcrumb items={[{ label: 'Email Templates' }]} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        </div>
        <Button onClick={() => router.push('/admin/research/email-templates/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {EMAIL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {EMAIL_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {scriptStatusConfig[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates grouped by type */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground">No email templates yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first email template to get started.
          </p>
          <Button className="mt-4" onClick={() => router.push('/admin/research/email-templates/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">{EMAIL_TYPE_LABELS[type]}</h2>
              <span className="text-sm text-muted-foreground">
                {EMAIL_TYPE_DESCRIPTIONS[type]}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((template) => (
                <Link key={template.id} href={`/admin/research/email-templates/${template.id}`}>
                  <Card className="p-4 transition-colors hover:bg-accent/50 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-foreground line-clamp-1">
                        {template.subject}
                      </h3>
                      <Badge className={scriptStatusStyles[template.status]}>
                        {scriptStatusConfig[template.status].label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {template.persona ? (
                        <Badge className={researchPersonaStyles[template.persona]}>
                          {researchPersonaConfig[template.persona].label}
                        </Badge>
                      ) : (
                        <Badge variant="outline">All Personas</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {template.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">v{template.version}</p>
                    {template.reviewNotes && template.status === 'DRAFT' && (
                      <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 line-clamp-1">
                        Changes requested: {template.reviewNotes}
                      </p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
