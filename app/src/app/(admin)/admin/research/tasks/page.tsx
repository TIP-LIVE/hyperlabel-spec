import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { TaskBoard } from '@/components/admin/research/task-board'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Research Tasks',
  description: 'Manage research tasks',
}

export default async function ResearchTasksPage() {
  await requireAdmin()

  const tasks = await db.researchTask.findMany({
    include: {
      lead: {
        select: { id: true, name: true, company: true, persona: true },
      },
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  // Serialize dates for client component
  const serialized = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  return <TaskBoard initialTasks={serialized} />
}
