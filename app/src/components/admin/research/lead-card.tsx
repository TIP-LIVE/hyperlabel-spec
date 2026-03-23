'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Building2, User } from 'lucide-react'
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
  _count: { tasks: number }
}

interface LeadCardProps {
  lead: LeadCardData
}

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <Link
      href={`/admin/research/leads/${lead.id}`}
      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
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
    </Link>
  )
}
