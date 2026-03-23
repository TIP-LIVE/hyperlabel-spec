'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Building2, User } from 'lucide-react'
import {
  researchPersonaStyles,
  researchPersonaConfig,
  type ResearchPersona,
} from '@/lib/status-config'

export interface LeadCardData {
  id: string
  name: string
  email: string | null
  company: string | null
  role: string | null
  persona: string
  status: string
  source: string | null
  updatedAt: string
  _count: { tasks: number }
}

interface LeadCardProps {
  lead: LeadCardData
}

export function LeadCard({ lead }: LeadCardProps) {
  const isStale =
    lead.status === 'CONTACTED' &&
    Date.now() - new Date(lead.updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000

  return (
    <Link
      href={`/admin/research/leads/${lead.id}`}
      className={`block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 ${isStale ? 'border-yellow-500/50' : 'border-border'}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium text-foreground">{lead.name}</p>
        <Badge className={researchPersonaStyles[lead.persona as ResearchPersona]} >
          {researchPersonaConfig[lead.persona as ResearchPersona].label}
        </Badge>
      </div>
      {(lead.role || lead.company) && (
        <div className="mb-2 space-y-1 text-xs text-muted-foreground">
          {lead.role && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {lead.role}
            </div>
          )}
          {lead.company && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {lead.company}
            </div>
          )}
        </div>
      )}
      {lead.source && (
        <p className="text-xs text-muted-foreground">
          Source: {lead.source}
        </p>
      )}
      {isStale && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-3 w-3" />
          Stale — contacted &gt;7 days ago
        </div>
      )}
    </Link>
  )
}
