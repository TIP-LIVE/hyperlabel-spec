import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { EmailTemplateEditor } from '@/components/admin/research/email-template-editor'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Edit Email Template',
  description: 'Edit email template',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EmailTemplateEditorPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params

  const template = await db.researchEmailTemplate.findUnique({ where: { id } })

  if (!template) {
    notFound()
  }

  const serialized = {
    ...template,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    reviewedAt: template.reviewedAt?.toISOString() ?? null,
  }

  return <EmailTemplateEditor template={serialized} />
}
