'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, ListTodo, Loader2, CircleDot, CheckCircle2 } from 'lucide-react'
import { TaskCard } from './task-card'
import { ResearchBreadcrumb } from './research-breadcrumb'

interface TaskData {
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

interface TaskBoardProps {
  initialTasks: TaskData[]
}

const COLUMNS = [
  { status: 'TODO', label: 'To Do', icon: ListTodo, color: 'text-muted-foreground' },
  { status: 'IN_PROGRESS', label: 'In Progress', icon: CircleDot, color: 'text-blue-500' },
  { status: 'DONE', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
]

const CATEGORIES = [
  { value: 'OUTREACH', label: 'Outreach' },
  { value: 'SCHEDULING', label: 'Scheduling' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'GIFT_CARD', label: 'Gift Card' },
  { value: 'ANALYSIS', label: 'Analysis' },
  { value: 'REVIEW', label: 'Review' },
]

export function TaskBoard({ initialTasks }: TaskBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'FOLLOW_UP',
  })
  const [isCreating, setIsCreating] = useState(false)

  const handleStatusChange = useCallback(async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    const res = await fetch(`/api/v1/admin/research/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!res.ok) {
      // Revert on failure
      router.refresh()
    }
  }, [router])

  const handleDelete = useCallback(async (taskId: string) => {
    if (!confirm('Delete this task?')) return

    setTasks((prev) => prev.filter((t) => t.id !== taskId))

    const res = await fetch(`/api/v1/admin/research/tasks/${taskId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      router.refresh()
    }
  }, [router])

  const handleCreateTask = useCallback(async () => {
    if (!newTask.title.trim()) return
    setIsCreating(true)

    try {
      const res = await fetch('/api/v1/admin/research/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })

      if (res.ok) {
        const created = await res.json()
        setTasks((prev) => [created, ...prev])
        setNewTask({ title: '', description: '', category: 'FOLLOW_UP' })
        setAddDialogOpen(false)
      }
    } finally {
      setIsCreating(false)
    }
  }, [newTask])

  return (
    <div className="space-y-4">
      <ResearchBreadcrumb items={[{ label: 'Tasks' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Board</h1>
          <p className="text-muted-foreground text-sm">
            {tasks.filter((t) => t.status !== 'DONE').length} open tasks
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Send gift card to John"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newTask.category}
                  onValueChange={(v) => setNewTask({ ...newTask, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleCreateTask}
                disabled={!newTask.title.trim() || isCreating}
                className="w-full"
              >
                {isCreating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map(({ status, label, icon: Icon, color }) => {
          const columnTasks = tasks.filter((t) => t.status === status)
          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <h2 className="text-sm font-semibold text-foreground">{label}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[100px] rounded-lg border border-dashed border-border p-2">
                {columnTasks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No tasks
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
