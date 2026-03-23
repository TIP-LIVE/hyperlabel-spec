'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Search, MoreVertical } from 'lucide-react'
import { LeadCard, type LeadCardData } from './lead-card'
import { ResearchBreadcrumb } from './research-breadcrumb'
import {
  researchLeadStatusStyles,
  researchLeadStatusConfig,
  type ResearchLeadStatus,
} from '@/lib/status-config'

/** The main pipeline columns (not DECLINED/NO_SHOW — those are terminal) */
const PIPELINE_COLUMNS: ResearchLeadStatus[] = [
  'SOURCED',
  'CONTACTED',
  'SCREENED',
  'SCHEDULED',
  'COMPLETED',
  'ANALYSED',
]

const ALL_STATUSES: ResearchLeadStatus[] = [
  'SOURCED',
  'CONTACTED',
  'SCREENED',
  'SCHEDULED',
  'COMPLETED',
  'ANALYSED',
  'DECLINED',
  'NO_SHOW',
]

interface LeadBoardProps {
  leads: LeadCardData[]
}

export function LeadBoard({ leads: initialLeads }: LeadBoardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '')

  // Group leads by status
  const leadsByStatus = PIPELINE_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = initialLeads.filter((l) => l.status === status)
      return acc
    },
    {} as Record<string, LeadCardData[]>
  )

  // Terminal leads shown separately
  const declinedLeads = initialLeads.filter((l) => l.status === 'DECLINED' || l.status === 'NO_SHOW')

  async function moveLead(leadId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/v1/admin/research/leads/${leadId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        startTransition(() => router.refresh())
      }
    } catch (error) {
      console.error('Failed to move lead:', error)
    }
  }

  function handleSearch(value: string) {
    setSearchValue(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    startTransition(() => router.push(`/admin/research/leads?${params.toString()}`))
  }

  function handlePersonaFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') {
      params.set('persona', value)
    } else {
      params.delete('persona')
    }
    startTransition(() => router.push(`/admin/research/leads?${params.toString()}`))
  }

  return (
    <div className="space-y-4">
      <ResearchBreadcrumb items={[{ label: 'Leads' }]} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Board</h1>
          <p className="text-sm text-muted-foreground">
            {initialLeads.length} lead{initialLeads.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/research/leads/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={searchParams.get('persona') || 'ALL'}
          onValueChange={handlePersonaFilter}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Personas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Personas</SelectItem>
            <SelectItem value="CONSIGNEE">Consignee</SelectItem>
            <SelectItem value="FORWARDER">Forwarder</SelectItem>
            <SelectItem value="SHIPPER">Shipper</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Columns */}
      <div className="overflow-x-auto pb-4" style={{ opacity: isPending ? 0.6 : 1 }}>
        <div className="flex gap-4" style={{ minWidth: `${PIPELINE_COLUMNS.length * 280}px` }}>
          {PIPELINE_COLUMNS.map((status) => {
            const columnLeads = leadsByStatus[status] || []
            return (
              <div key={status} className="flex w-[260px] shrink-0 flex-col">
                {/* Column Header */}
                <div className="mb-3 flex items-center gap-2">
                  <Badge className={researchLeadStatusStyles[status]}>
                    {researchLeadStatusConfig[status].label}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex min-h-[200px] flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2">
                  {columnLeads.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">No leads</p>
                  ) : (
                    columnLeads.map((lead) => (
                      <div key={lead.id} className="group relative">
                        <LeadCard lead={lead} />
                        {/* Move dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100">
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {ALL_STATUSES.filter((s) => s !== lead.status).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => moveLead(lead.id, s)}
                              >
                                Move to{' '}
                                <Badge className={`ml-2 ${researchLeadStatusStyles[s]}`}>
                                  {researchLeadStatusConfig[s].label}
                                </Badge>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Declined / No-Show leads */}
      {declinedLeads.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Declined / No-Show ({declinedLeads.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {declinedLeads.map((lead) => (
              <div key={lead.id} className="group relative">
                <LeadCard lead={lead} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {PIPELINE_COLUMNS.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => moveLead(lead.id, s)}
                      >
                        Move to{' '}
                        <Badge className={`ml-2 ${researchLeadStatusStyles[s]}`}>
                          {researchLeadStatusConfig[s].label}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
