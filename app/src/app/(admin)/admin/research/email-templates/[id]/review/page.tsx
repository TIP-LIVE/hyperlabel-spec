import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { EmailTemplateReview } from '@/components/admin/research/email-template-review'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Review Email Template',
  description: 'CEO review of email template',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EmailTemplateReviewPage({ params }: PageProps) {
  await requireAdmin()
  const { id } = await params

  const template = await db.researchEmailTemplate.findUnique({ where: { id } })

  if (!template) {
    notFound()
  }

  // Only show review page for templates that are IN_REVIEW
  if (template.status !== 'IN_REVIEW') {
    redirect(`/admin/research/email-templates/${id}`)
  }

  const serialized = {
    ...template,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }

  return <EmailTemplateReview template={serialized} />
}
