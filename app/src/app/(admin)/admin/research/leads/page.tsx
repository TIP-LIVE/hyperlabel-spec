import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { LeadBoard } from '@/components/admin/research/lead-board'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Research Lead Board',
  description: 'Kanban board for research interview leads',
}

interface PageProps {
  searchParams: Promise<{ persona?: string; q?: string; status?: string }>
}

export default async function ResearchLeadsPage({ searchParams }: PageProps) {
  await requireAdmin()

  const { persona, q, status } = await searchParams

  const where: Record<string, unknown> = {}
  if (persona) {
    where.persona = persona
  }
  if (status) {
    where.status = status
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { company: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  const leads = await db.researchLead.findMany({
    where,
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Serialize dates for client components
  const serialized = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }))

  return <LeadBoard leads={serialized} />
}
