import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { LeadDetail } from '@/components/admin/research/lead-detail'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const lead = await db.researchLead.findUnique({ where: { id }, select: { name: true } })
  return {
    title: lead ? `${lead.name} — Research` : 'Lead Not Found',
  }
}

export default async function ResearchLeadDetailPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params

  const lead = await db.researchLead.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!lead) {
    notFound()
  }

  // Serialize dates for client component
  const serialized = {
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    tasks: lead.tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  }

  return <LeadDetail lead={serialized} />
}
