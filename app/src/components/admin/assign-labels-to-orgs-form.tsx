'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'

function parseDeviceIds(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

interface AssignLabelsToOrgsFormProps {
  knownOrgIds: string[]
}

export function AssignLabelsToOrgsForm({ knownOrgIds }: AssignLabelsToOrgsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Array<{ orgId: string; otherOrgId: string; deviceIds: string }>>([
    { orgId: '', otherOrgId: '', deviceIds: '' },
  ])

  const addRow = () => {
    setRows((r) => [...r, { orgId: '', otherOrgId: '', deviceIds: '' }])
  }

  const removeRow = (index: number) => {
    setRows((r) => (r.length <= 1 ? r : r.filter((_, i) => i !== index)))
  }

  const updateRow = (index: number, field: 'orgId' | 'otherOrgId' | 'deviceIds', value: string) => {
    setRows((r) => {
      const next = [...r]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const assignments: Array<{ orgId: string; deviceIds: string[] }> = []

    for (const row of rows) {
      const orgId = row.orgId === '__other__' ? row.otherOrgId.trim() : row.orgId
      const deviceIds = parseDeviceIds(row.deviceIds)
      if (!orgId || deviceIds.length === 0) continue
      assignments.push({ orgId, deviceIds })
    }

    if (assignments.length === 0) {
      toast.error('Add at least one organisation and device IDs')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/labels/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to assign labels')
        return
      }

      const total = data.results?.reduce((acc: number, r: { registered: number }) => acc + r.registered, 0) ?? 0
      toast.success(`Assigned ${total} label(s) across ${data.results?.length ?? 0} organisation(s)`)
      router.push('/admin/labels')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Organisation {index + 1}</span>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-red-400"
                  onClick={() => removeRow(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`org-${index}`}>Organisation</Label>
                <Select
                  value={row.orgId || undefined}
                  onValueChange={(v) => updateRow(index, 'orgId', v)}
                >
                  <SelectTrigger id={`org-${index}`} className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select or enter below" />
                  </SelectTrigger>
                  <SelectContent>
                    {knownOrgIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                    <SelectItem value="__other__">Other (enter below)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {row.orgId === '__other__' && (
                <div className="space-y-2">
                  <Label htmlFor={`other-org-${index}`}>Clerk Organisation ID</Label>
                  <Input
                    id={`other-org-${index}`}
                    placeholder="org_..."
                    className="bg-gray-800 border-gray-700 font-mono text-sm"
                    value={row.otherOrgId}
                    onChange={(e) => updateRow(index, 'otherOrgId', e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`devices-${index}`}>Device IDs (one per line or comma-separated)</Label>
              <textarea
                id={`devices-${index}`}
                className="min-h-[80px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="TIP-001, TIP-003"
                value={row.deviceIds}
                onChange={(e) => updateRow(index, 'deviceIds', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={addRow} className="border-gray-600 text-gray-300">
          <Plus className="mr-2 h-4 w-4" />
          Add another organisation
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Assign labels
        </Button>
      </div>
    </form>
  )
}
