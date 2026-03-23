import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ScriptList } from '@/components/admin/research/script-list'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Interview Scripts',
  description: 'Manage interview scripts for user research',
}

export default async function ResearchScriptsPage() {
  await requireAdmin()

  const scripts = await db.researchScript.findMany({
    orderBy: [{ persona: 'asc' }, { version: 'desc' }],
  })

  // Serialize dates and parse sections for the client component
  const serialized = scripts.map((s) => ({
    ...s,
    sections: s.sections as Array<{ title: string; duration: number; questions: Array<{ text: string }> }>,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    reviewedAt: s.reviewedAt?.toISOString() ?? null,
  }))

  return <ScriptList scripts={serialized} />
}
