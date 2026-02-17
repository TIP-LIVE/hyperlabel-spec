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

interface AssignPageProps {
  searchParams: Promise<{ ids?: string }>
}

export default async function AssignLabelsPage({ searchParams }: AssignPageProps) {
  const { ids: idsParam } = await searchParams
  const initialDeviceIds: string[] =
    idsParam != null && idsParam.trim() !== ''
      ? idsParam
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      : []

  const orgs = await db.order.findMany({
    where: { orgId: { not: null } },
    select: { orgId: true },
    distinct: ['orgId'],
  })
  const knownOrgIds = orgs.map((o) => o.orgId).filter((id): id is string => id != null)

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header className="space-y-1.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/labels" aria-label="Back to Label Inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Assign Labels to Organisations
          </h1>
        </div>
        <p className="text-muted-foreground pl-11 text-sm sm:pl-12">
          Add or move labels to an organisation. See “How it works” below for rules and format.
        </p>
      </header>

      <Card className="border-border/80 bg-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Assignments
          </CardTitle>
          <CardDescription className="text-sm">
            Choose an organisation and enter the device IDs to assign. The list only includes orgs
            that already have orders. If your org (e.g. TIP PROD TEST) is not listed, use
            &quot;Other&quot; and paste its Organisation ID from the Clerk dashboard — that org
            must have at least one order first.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <AssignLabelsToOrgsForm
            knownOrgIds={knownOrgIds}
            initialDeviceIds={initialDeviceIds.length > 0 ? initialDeviceIds : undefined}
          />
        </CardContent>
      </Card>
    </div>
  )
}
