import { requireAdmin } from '@/lib/auth'
import { CalendarView } from '@/components/admin/research/calendar-view'
import { ResearchBreadcrumb } from '@/components/admin/research/research-breadcrumb'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Interview Calendar',
  description: 'Upcoming research interviews',
}

export default async function CalendarPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <ResearchBreadcrumb items={[{ label: 'Calendar' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Interview Calendar</h1>
        <p className="text-muted-foreground">Scheduled and past interviews</p>
      </div>

      <CalendarView />
    </div>
  )
}
