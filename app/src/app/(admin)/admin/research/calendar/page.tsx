import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { CalendarView } from '@/components/admin/research/calendar-view'
import { ArrowLeft } from 'lucide-react'
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/research" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Interview Calendar</h1>
            <p className="text-muted-foreground">Scheduled and past interviews</p>
          </div>
        </div>
      </div>

      <CalendarView />
    </div>
  )
}
