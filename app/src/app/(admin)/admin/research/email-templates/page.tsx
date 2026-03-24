import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { EmailTemplateList } from '@/components/admin/research/email-template-list'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Email Templates',
  description: 'Manage email templates for user research',
}

export default async function EmailTemplatesPage() {
  await requireAdmin()

  const templates = await db.researchEmailTemplate.findMany({
    orderBy: [{ type: 'asc' }, { persona: 'asc' }],
  })

  const serialized = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    reviewedAt: t.reviewedAt?.toISOString() ?? null,
  }))

  return <EmailTemplateList templates={serialized} />
}
