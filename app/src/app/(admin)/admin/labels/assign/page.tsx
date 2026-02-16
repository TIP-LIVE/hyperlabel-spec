import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { AssignLabelsToOrgsForm } from '@/components/admin/assign-labels-to-orgs-form'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Assign Labels to Organisations',
  description: 'Admin: assign tracking labels to one or more organisations',
}

export default async function AssignLabelsPage() {
  const orgs = await db.order.findMany({
    where: { orgId: { not: null } },
    select: { orgId: true },
    distinct: ['orgId'],
  })
  const knownOrgIds = orgs.map((o) => o.orgId).filter((id): id is string => id != null)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/labels">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Assign Labels to Organisations</h1>
          <p className="text-gray-400">
            Add or move labels to any organisation. Labels already in the target org are skipped.
          </p>
        </div>
      </div>

      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Assignments</CardTitle>
          <CardDescription>
            Choose one or more organisations and the device IDs to assign. A label can only belong
            to one org; if the same device ID appears in multiple rows, it will end up in the last
            processed org.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssignLabelsToOrgsForm knownOrgIds={knownOrgIds} />
        </CardContent>
      </Card>
    </div>
  )
}
