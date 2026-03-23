import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { AddLeadForm } from '@/components/admin/research/add-lead-form'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Add Research Lead',
}

export default async function AddResearchLeadPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/research/leads" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Lead</h1>
          <p className="text-sm text-muted-foreground">Add a new person to the research pipeline</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <AddLeadForm />
      </div>
    </div>
  )
}
