import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ScriptReview } from '@/components/admin/research/script-review'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Review Script',
  description: 'CEO review of interview script',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ScriptReviewPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params

  const script = await db.researchScript.findUnique({ where: { id } })

  if (!script) {
    notFound()
  }

  // Only show review page for scripts that are IN_REVIEW
  if (script.status !== 'IN_REVIEW') {
    redirect(`/admin/research/scripts/${id}`)
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
  }

  return <ScriptReview script={serialized} />
}
