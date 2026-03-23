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
import { ArrowLeft, Plus, FileText, Clock } from 'lucide-react'
import {
  scriptStatusConfig,
  scriptStatusStyles,
  researchPersonaConfig,
  researchPersonaStyles,
  type ScriptStatus,
  type ResearchPersona,
} from '@/lib/status-config'

interface ScriptData {
  id: string
  title: string
  persona: ResearchPersona
  status: ScriptStatus
  version: number
  sections: Array<{ title: string; duration: number; questions: Array<{ text: string }> }>
  reviewedBy: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

interface ScriptListProps {
  scripts: ScriptData[]
}

const PERSONAS: ResearchPersona[] = ['CONSIGNEE', 'FORWARDER', 'SHIPPER']
const STATUSES: ScriptStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED']

export function ScriptList({ scripts }: ScriptListProps) {
  const router = useRouter()
  const [personaFilter, setPersonaFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = scripts.filter((s) => {
    if (personaFilter !== 'all' && s.persona !== personaFilter) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    return true
  })

  const grouped = PERSONAS.reduce(
    (acc, persona) => {
      const items = filtered.filter((s) => s.persona === persona)
      if (items.length > 0) acc[persona] = items
      return acc
    },
    {} as Record<string, ScriptData[]>
  )

  const totalQuestions = (sections: ScriptData['sections']) =>
    sections.reduce((sum, s) => sum + s.questions.length, 0)

  const totalDuration = (sections: ScriptData['sections']) =>
    sections.reduce((sum, s) => sum + s.duration, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/research">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Interview Scripts</h1>
            <p className="text-sm text-muted-foreground">{scripts.length} scripts</p>
          </div>
        </div>
        <Button onClick={() => router.push('/admin/research/scripts/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Script
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={personaFilter} onValueChange={setPersonaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Personas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Personas</SelectItem>
            {PERSONAS.map((p) => (
              <SelectItem key={p} value={p}>
                {researchPersonaConfig[p].label}
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

      {/* Scripts grouped by persona */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground">No scripts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first interview script to get started.
          </p>
          <Button className="mt-4" onClick={() => router.push('/admin/research/scripts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Script
          </Button>
        </Card>
      ) : (
        Object.entries(grouped).map(([persona, items]) => (
          <div key={persona} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={researchPersonaStyles[persona as ResearchPersona]}>
                {researchPersonaConfig[persona as ResearchPersona].label}
              </Badge>
              <span className="text-sm text-muted-foreground">{items.length} script{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((script) => (
                <Link key={script.id} href={`/admin/research/scripts/${script.id}`}>
                  <Card className="p-4 transition-colors hover:bg-accent/50 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-foreground line-clamp-1">
                        {script.title}
                      </h3>
                      <Badge className={scriptStatusStyles[script.status]}>
                        {scriptStatusConfig[script.status].label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {script.sections.length} sections
                      </span>
                      <span>{totalQuestions(script.sections)} questions</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {totalDuration(script.sections)} min
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">v{script.version}</p>
                    {script.reviewNotes && script.status === 'DRAFT' && (
                      <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 line-clamp-1">
                        Changes requested: {script.reviewNotes}
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
