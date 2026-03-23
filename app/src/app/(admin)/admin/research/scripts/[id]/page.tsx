import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ScriptEditor } from '@/components/admin/research/script-editor'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Edit Script',
  description: 'Edit interview script',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ScriptEditorPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params

  const script = await db.researchScript.findUnique({ where: { id } })

  if (!script) {
    notFound()
  }

  const serialized = {
    ...script,
    sections: script.sections as Array<{
      title: string
      duration: number
      questions: Array<{ text: string; probes: string[] }>
    }>,
    createdAt: script.createdAt.toISOString(),
    updatedAt: script.updatedAt.toISOString(),
    reviewedAt: script.reviewedAt?.toISOString() ?? null,
  }

  return <ScriptEditor script={serialized} />
}
