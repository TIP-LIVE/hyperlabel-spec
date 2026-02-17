'use client'

import { useState, useMemo } from 'react'
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
import { Loader2, Plus, Search, Trash2 } from 'lucide-react'

function parseDeviceIds(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

/** Shorten org ID for display; show last 16 chars so it's scannable */
function shortOrgId(id: string, max = 24): string {
  if (id.length <= max) return id
  return '…' + id.slice(-Math.min(16, id.length - 4))
}

interface AssignLabelsToOrgsFormProps {
  knownOrgIds: string[]
  /** Pre-fill first row device IDs when coming from Label Inventory selection */
  initialDeviceIds?: string[]
}

const defaultRow = (): { orgId: string; otherOrgId: string; deviceIds: string } => ({
  orgId: '',
  otherOrgId: '',
  deviceIds: '',
})

export function AssignLabelsToOrgsForm({
  knownOrgIds,
  initialDeviceIds,
}: AssignLabelsToOrgsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [orgSearch, setOrgSearch] = useState('')
  const [rows, setRows] = useState<Array<{ orgId: string; otherOrgId: string; deviceIds: string }>>(
    () =>
      initialDeviceIds?.length
        ? [{ ...defaultRow(), deviceIds: initialDeviceIds.join('\n') }]
        : [defaultRow()]
  )

  const filteredOrgIds = useMemo(() => {
    if (!orgSearch.trim()) return knownOrgIds
    const q = orgSearch.trim().toLowerCase()
    return knownOrgIds.filter((id) => id.toLowerCase().includes(q))
  }, [knownOrgIds, orgSearch])

  /** Org IDs to show in dropdown: filtered list plus any currently selected (so selection doesn’t disappear when search hides it) */
  const orgIdsForSelect = useMemo(() => {
    const selected = rows.map((r) => r.orgId).filter((id) => id && id !== '__other__' && knownOrgIds.includes(id))
    return [...new Set([...filteredOrgIds, ...selected])]
  }, [filteredOrgIds, rows, knownOrgIds])

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
      {knownOrgIds.length > 2 && (
        <div className="space-y-2">
          <Label htmlFor="org-search" className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Search organisations
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="org-search"
              type="search"
              placeholder="Type part of org ID to filter…"
              className="pl-9 bg-background/50 border-border"
              value={orgSearch}
              onChange={(e) => setOrgSearch(e.target.value)}
            />
          </div>
          {orgSearch && (
            <p className="text-muted-foreground text-xs">
              Showing {filteredOrgIds.length} of {knownOrgIds.length} organisation(s)
            </p>
          )}
        </div>
      )}

      {rows.length > 1 && (
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-[1fr_1fr] rounded-t-lg border border-b-0 border-border bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground">
          <span>Organisation</span>
          <span>Device IDs</span>
        </div>
      )}

      <div className={rows.length > 1 ? 'space-y-0' : 'space-y-4'}>
        {rows.map((row, index) => (
          <div
            key={index}
            className={
              rows.length > 1
                ? 'grid grid-cols-1 gap-x-4 gap-y-2 border border-t-0 border-border bg-card/50 p-4 sm:grid-cols-[1fr_1fr] first:border-t-0 last:rounded-b-lg'
                : 'rounded-xl border border-border bg-card/50 p-5 shadow-sm space-y-4'
            }
          >
            {rows.length > 1 ? (
              <>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor={`org-${index}`} className="text-xs text-muted-foreground">
                    Organisation {index + 1}
                  </Label>
                  <Select
                    value={row.orgId || undefined}
                    onValueChange={(v) => updateRow(index, 'orgId', v)}
                  >
                    <SelectTrigger id={`org-${index}`} className="w-full bg-background/50">
                      <SelectValue placeholder="Select or paste ID below" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredOrgIds.length === 0 && orgIdsForSelect.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          {orgSearch ? 'No match — try another search or use Other' : 'No organisations yet'}
                        </SelectItem>
                      )}
                      {orgIdsForSelect.map((id) => (
                        <SelectItem key={id} value={id} title={id}>
                          <span className="font-mono text-xs">{shortOrgId(id)}</span>
                        </SelectItem>
                      ))}
                      <SelectItem value="__other__">Other (paste Clerk org ID)</SelectItem>
                    </SelectContent>
                  </Select>
                  {row.orgId === '__other__' && (
                    <Input
                      id={`other-org-${index}`}
                      placeholder="org_… (copy from Clerk dashboard)"
                      className="font-mono text-sm bg-background/50"
                      value={row.otherOrgId}
                      onChange={(e) => updateRow(index, 'otherOrgId', e.target.value)}
                    />
                  )}
                </div>
                <div className="flex items-start gap-2 min-w-0">
                  <div className="flex-1 space-y-1 min-w-0">
                    <Label htmlFor={`devices-${index}`} className="text-xs text-muted-foreground">
                      Device IDs
                    </Label>
                    <textarea
                      id={`devices-${index}`}
                      className="min-h-[72px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder={'TIP-001\nTIP-003'}
                      value={row.deviceIds}
                      onChange={(e) => updateRow(index, 'deviceIds', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Organisation {index + 1}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`org-${index}`}>Organisation</Label>
                    <Select
                      value={row.orgId || undefined}
                      onValueChange={(v) => updateRow(index, 'orgId', v)}
                    >
                      <SelectTrigger id={`org-${index}`} className="w-full bg-background/50">
                        <SelectValue placeholder="Select or paste ID below" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredOrgIds.length === 0 && orgIdsForSelect.length === 0 && (
                          <SelectItem value="__none__" disabled>
                            {orgSearch ? 'No match — try another search or use Other' : 'No organisations yet'}
                          </SelectItem>
                        )}
                        {orgIdsForSelect.map((id) => (
                          <SelectItem key={id} value={id} title={id}>
                            <span className="font-mono text-xs">{shortOrgId(id)}</span>
                          </SelectItem>
                        ))}
                        <SelectItem value="__other__">Other (paste Clerk org ID)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {row.orgId === '__other__' && (
                    <div className="space-y-2">
                      <Label htmlFor={`other-org-${index}`}>Clerk Organisation ID</Label>
                      <Input
                        id={`other-org-${index}`}
                        placeholder="org_… (copy from Clerk dashboard)"
                        className="font-mono text-sm bg-background/50"
                        value={row.otherOrgId}
                        onChange={(e) => updateRow(index, 'otherOrgId', e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`devices-${index}`}>Device IDs</Label>
                  <p className="text-muted-foreground text-xs">
                    One per line or comma-separated, e.g. HL-001234, TIP-001
                  </p>
                  <textarea
                    id={`devices-${index}`}
                    className="min-h-[88px] w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={'TIP-001\nTIP-003'}
                    value={row.deviceIds}
                    onChange={(e) => updateRow(index, 'deviceIds', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>


      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="button" variant="outline" onClick={addRow}>
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
