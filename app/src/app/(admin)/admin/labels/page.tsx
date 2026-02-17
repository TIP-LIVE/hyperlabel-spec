import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'
import { AdminSearch } from '@/components/admin/admin-search'
import { LabelsTableWithSelection } from '@/components/admin/labels-table-with-selection'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Label Inventory',
  description: 'Manage TIP inventory',
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

  const labelRows = labels.map((label) => ({
    id: label.id,
    deviceId: label.deviceId,
    imei: label.imei,
    status: label.status,
    batteryPct: label.batteryPct,
    activatedAt: label.activatedAt,
    orderLabels: label.orderLabels,
  }))

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'ALL' ? '/admin/labels' : `/admin/labels?status=${tab.value}`}
          >
            <Card
              className={`border-gray-800 bg-gray-800/50 transition-colors hover:border-gray-600 ${currentStatus === tab.value ? 'border-primary' : ''}`}
            >
              <CardContent className="pt-6">
                <p
                  className={`text-2xl font-bold ${
                    tab.value === 'ALL'
                      ? 'text-white'
                      : tab.value === 'INVENTORY'
                        ? 'text-gray-400'
                        : tab.value === 'SOLD'
                          ? 'text-blue-400'
                          : tab.value === 'ACTIVE'
                            ? 'text-green-400'
                            : 'text-red-400'
                  }`}
                >
                  {tab.count}
                </p>
                <p className="text-xs text-gray-500">{tab.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <AdminSearch placeholder="Search by device ID, IMEI, or owner email..." />

      <LabelsTableWithSelection
        labels={labelRows}
        totalCount={totalCount}
        q={q}
        page={page}
        statusFilter={statusFilter}
        totalPages={totalPages}
      />
    </div>
  )
}
