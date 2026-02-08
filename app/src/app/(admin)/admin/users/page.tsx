import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { AdminSearch } from '@/components/admin/admin-search'
import { ToggleRoleButton } from '@/components/admin/toggle-role-button'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage TIP users',
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { q, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1)
  const perPage = 25

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [users, totalCount] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        _count: { select: { orders: true, shipments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.user.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-gray-400">View and manage registered users</p>
      </div>

      <AdminSearch placeholder="Search by email or name..." />

      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">All Users ({totalCount})</CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'List of all registered accounts'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Orders</th>
                  <th className="pb-3 font-medium">Shipments</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="text-sm">
                    <td className="py-3 text-white">{user.email}</td>
                    <td className="py-3 text-gray-300">
                      {user.firstName || user.lastName
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : '—'}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={user.role === 'admin' ? 'bg-primary' : ''}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-300">{user._count.orders}</td>
                    <td className="py-3 text-gray-300">{user._count.shipments}</td>
                    <td className="py-3 text-gray-400">
                      {format(new Date(user.createdAt), 'PP')}
                    </td>
                    <td className="py-3">
                      <ToggleRoleButton userId={user.id} currentRole={user.role} />
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      {q ? 'No users match your search' : 'No users found'}
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
                    href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) }).toString()}`}
                    className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) }).toString()}`}
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
