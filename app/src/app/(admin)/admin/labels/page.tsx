import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { Plus, Building2 } from 'lucide-react'
import { AdminSearch } from '@/components/admin/admin-search'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Label Inventory',
  description: 'Manage TIP inventory',
}

const statusStyles: Record<string, string> = {
  INVENTORY: 'bg-gray-500/20 text-gray-400',
  SOLD: 'bg-blue-500/20 text-blue-400',
  ACTIVE: 'bg-green-500/20 text-green-400',
  DEPLETED: 'bg-red-500/20 text-red-400',
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

export default async function AdminLabelsPage({ searchParams }: PageProps) {
  const { q, status: statusFilter, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1)
  const perPage = 25

  const where: Record<string, unknown> = {}

  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter
  }

  if (q) {
    where.OR = [
      { deviceId: { contains: q, mode: 'insensitive' } },
      { imei: { contains: q, mode: 'insensitive' } },
      { orderLabels: { some: { order: { user: { email: { contains: q, mode: 'insensitive' } } } } } },
    ]
  }

  const [labels, totalCount, statusCounts] = await Promise.all([
    db.label.findMany({
      where,
      include: {
        orderLabels: {
          take: 1,
          include: { order: { select: { id: true, user: { select: { email: true } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.label.count({ where }),
    Promise.all([
      db.label.count(),
      db.label.count({ where: { status: 'INVENTORY' } }),
      db.label.count({ where: { status: 'SOLD' } }),
      db.label.count({ where: { status: 'ACTIVE' } }),
      db.label.count({ where: { status: 'DEPLETED' } }),
    ]),
  ])

  const totalPages = Math.ceil(totalCount / perPage)
  const [allCount, inventoryCount, soldCount, activeCount, depletedCount] = statusCounts

  const statusTabs = [
    { label: 'All', value: 'ALL', count: allCount },
    { label: 'Inventory', value: 'INVENTORY', count: inventoryCount },
    { label: 'Sold', value: 'SOLD', count: soldCount },
    { label: 'Active', value: 'ACTIVE', count: activeCount },
    { label: 'Depleted', value: 'DEPLETED', count: depletedCount },
  ]

  const currentStatus = statusFilter || 'ALL'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Label Inventory</h1>
          <p className="text-gray-400">Track and manage all labels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-gray-600">
            <Link href="/admin/labels/assign">
              <Building2 className="mr-2 h-4 w-4" />
              Assign to org(s)
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/labels/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Labels
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'ALL' ? '/admin/labels' : `/admin/labels?status=${tab.value}`}
          >
            <Card className={`border-gray-800 bg-gray-800/50 transition-colors hover:border-gray-600 ${currentStatus === tab.value ? 'border-primary' : ''}`}>
              <CardContent className="pt-6">
                <p className={`text-2xl font-bold ${
                  tab.value === 'ALL' ? 'text-white' :
                  tab.value === 'INVENTORY' ? 'text-gray-400' :
                  tab.value === 'SOLD' ? 'text-blue-400' :
                  tab.value === 'ACTIVE' ? 'text-green-400' :
                  'text-red-400'
                }`}>
                  {tab.count}
                </p>
                <p className="text-xs text-gray-500">{tab.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <AdminSearch placeholder="Search by device ID, IMEI, or owner email..." />

      {/* Labels Table */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Labels ({totalCount})</CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'Complete inventory list'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                  <th className="pb-3 font-medium">Device ID</th>
                  <th className="pb-3 font-medium">IMEI</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Battery</th>
                  <th className="pb-3 font-medium">Owner</th>
                  <th className="pb-3 font-medium">Activated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {labels.map((label) => (
                  <tr key={label.id} className="text-sm">
                    <td className="py-3 font-mono text-white">{label.deviceId}</td>
                    <td className="py-3 font-mono text-gray-400">{label.imei || '—'}</td>
                    <td className="py-3">
                      <Badge className={statusStyles[label.status]}>{label.status}</Badge>
                    </td>
                    <td className="py-3">
                      {label.batteryPct !== null ? (
                        <span className={label.batteryPct < 20 ? 'text-red-400' : 'text-gray-300'}>
                          {label.batteryPct}%
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-300">{label.orderLabels[0]?.order?.user?.email || '—'}</td>
                    <td className="py-3 text-gray-400">
                      {label.activatedAt ? format(new Date(label.activatedAt), 'PP') : '—'}
                    </td>
                  </tr>
                ))}
                {labels.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      {q ? 'No labels match your search' : 'No labels in inventory'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
              <p className="text-sm text-gray-400">Page {page} of {totalPages} ({totalCount} total)</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/labels?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(page - 1) }).toString()}`}
                    className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/labels?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(page + 1) }).toString()}`}
                    className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
