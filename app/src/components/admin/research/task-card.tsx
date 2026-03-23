'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ArrowRight, Trash2, User, Calendar } from 'lucide-react'
import { researchPersonaStyles, researchPersonaConfig, type ResearchPersona } from '@/lib/status-config'

const CATEGORY_LABELS: Record<string, string> = {
  OUTREACH: 'Outreach',
  SCHEDULING: 'Scheduling',
  FOLLOW_UP: 'Follow-up',
  GIFT_CARD: 'Gift Card',
  ANALYSIS: 'Analysis',
  REVIEW: 'Review',
}

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'DONE'] as const

interface TaskCardProps {
  task: {
    id: string
    title: string
    description: string | null
    status: string
    category: string
    dueDate: string | null
    assignee: string | null
    createdAt: string
    lead: {
      id: string
      name: string
      company: string | null
      persona: string
    } | null
  }
  onStatusChange: (taskId: string, newStatus: string) => void
  onDelete: (taskId: string) => void
}

export function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const availableStatuses = STATUS_ORDER.filter((s) => s !== task.status)
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE'

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${task.status === 'DONE' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {task.title}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableStatuses.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(task.id, s)}>
                <ArrowRight className="mr-2 h-3.5 w-3.5" />
                Move to {s.replace('_', ' ')}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {CATEGORY_LABELS[task.category] || task.category}
        </Badge>

        {task.lead && (
          <Link href={`/admin/research/leads/${task.lead.id}`}>
            <Badge className={`text-[10px] px-1.5 py-0 ${researchPersonaStyles[task.lead.persona as ResearchPersona]}`}>
              {task.lead.name}
            </Badge>
          </Link>
        )}

        {task.dueDate && (
          <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            <Calendar className="h-2.5 w-2.5" />
            {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}

        {task.assignee && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <User className="h-2.5 w-2.5" />
            {task.assignee}
          </span>
        )}
      </div>
    </div>
  )
}
