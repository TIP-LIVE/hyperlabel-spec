import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Label Inventory',
  description: 'Manage HyperLabel inventory',
}

const statusStyles = {
  INVENTORY: 'bg-gray-500/20 text-gray-400',
  SOLD: 'bg-blue-500/20 text-blue-400',
  ACTIVE: 'bg-green-500/20 text-green-400',
  DEPLETED: 'bg-red-500/20 text-red-400',
}

export default async function AdminLabelsPage() {
  const labels = await db.label.findMany({
    include: {
      order: {
        select: {
          id: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Group counts
  const counts = {
    total: labels.length,
    inventory: labels.filter((l) => l.status === 'INVENTORY').length,
    sold: labels.filter((l) => l.status === 'SOLD').length,
    active: labels.filter((l) => l.status === 'ACTIVE').length,
    depleted: labels.filter((l) => l.status === 'DEPLETED').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Label Inventory</h1>
          <p className="text-gray-400">Track and manage all GPS labels</p>
        </div>
        <Button asChild>
          <Link href="/admin/labels/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Labels
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-white">{counts.total}</p>
            <p className="text-xs text-gray-500">Total Labels</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-gray-400">{counts.inventory}</p>
            <p className="text-xs text-gray-500">In Inventory</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-blue-400">{counts.sold}</p>
            <p className="text-xs text-gray-500">Sold</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-400">{counts.active}</p>
            <p className="text-xs text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-400">{counts.depleted}</p>
            <p className="text-xs text-gray-500">Depleted</p>
          </CardContent>
        </Card>
      </div>

      {/* Labels Table */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">All Labels</CardTitle>
          <CardDescription>Complete inventory list</CardDescription>
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
                        <span
                          className={
                            label.batteryPct < 20 ? 'text-red-400' : 'text-gray-300'
                          }
                        >
                          {label.batteryPct}%
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-300">{label.order?.user?.email || '—'}</td>
                    <td className="py-3 text-gray-400">
                      {label.activatedAt
                        ? format(new Date(label.activatedAt), 'PP')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
