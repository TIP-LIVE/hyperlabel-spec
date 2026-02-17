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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

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
  /** Current Clerk org (from auth) — assign here to see labels on that org's dashboard */
  currentOrgId?: string | null
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
  currentOrgId,
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
    const base = currentOrgId ? [...new Set([currentOrgId, ...knownOrgIds])] : knownOrgIds
    if (!orgSearch.trim()) return base
    const q = orgSearch.trim().toLowerCase()
    return base.filter((id) => id.toLowerCase().includes(q))
  }, [knownOrgIds, orgSearch, currentOrgId])

  /** Org IDs to show in dropdown: filtered list plus any currently selected (so selection doesn’t disappear when search hides it) */
  const orgIdsForSelect = useMemo(() => {
    const selected = rows
      .map((r) => (r.orgId === '__other__' ? r.otherOrgId.trim() : r.orgId))
      .filter((id) => id && id !== '__other__')
    const withCurrent = currentOrgId ? [currentOrgId, ...filteredOrgIds] : filteredOrgIds
    return [...new Set([...withCurrent, ...selected])]
  }, [filteredOrgIds, rows, currentOrgId])

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

      const results = data.results ?? []
      const total = results.reduce((acc: number, r: { registered: number }) => acc + r.registered, 0)
      const firstError = results.find((r: { error?: string }) => r.error) as { error?: string } | undefined
      const allAlreadyInOrg = results.flatMap((r: { skippedAlreadyInOrg?: string[] }) => r.skippedAlreadyInOrg ?? [])
      const allInUse = results.flatMap((r: { skippedInUse?: string[] }) => r.skippedInUse ?? [])
      const inOrgList = [...new Set(allAlreadyInOrg)]
      const inUseList = [...new Set(allInUse)]

      if (total === 0) {
        if (firstError?.error) {
          toast.error(firstError.error)
          return
        }
        if (inOrgList.length > 0 || inUseList.length > 0) {
          const parts: string[] = []
          if (inOrgList.length > 0) {
            parts.push(`${inOrgList.join(', ')} already in this organisation`)
          }
          if (inUseList.length > 0) {
            parts.push(`${inUseList.join(', ')} are in use (Active/Depleted) in another organisation and can't be reassigned`)
          }
          toast.warning(`No labels assigned: ${parts.join('. ')}.`)
          return
        }
        toast.warning(
          'No labels were assigned. Check that device IDs exist and the organisation has at least one order.'
        )
        return
      }

      toast.success(`Assigned ${total} label(s) across ${results.length} organisation(s)`)
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
      <Accordion type="single" collapsible className="rounded-lg border border-border/60 bg-muted/20">
        <AccordionItem value="how" className="border-0">
          <AccordionTrigger className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:no-underline">
            How it works
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3 pt-0 text-muted-foreground text-xs leading-relaxed">
            <ul className="list-inside space-y-1.5">
              <li>
                <strong className="text-foreground">One org per label:</strong> Each device ID is assigned to exactly one organisation. If you list the same ID in multiple rows, it ends up in the <em>last</em> organisation you list.
              </li>
              <li>
                <strong className="text-foreground">Already assigned:</strong> Labels that already belong to the target org are skipped (no error).
              </li>
              <li>
                <strong className="text-foreground">Format:</strong> Device IDs can be one per line or comma-separated (e.g. TIP-001, HL-001234).
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
                : 'rounded-xl border border-border bg-card/60 p-6 shadow-sm space-y-6'
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
                      <SelectValue placeholder="Select organisation or paste org_... ID" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredOrgIds.length === 0 && orgIdsForSelect.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          {orgSearch ? 'No match — try another search or use Other' : 'No organisations yet'}
                        </SelectItem>
                      )}
                      {orgIdsForSelect.map((id) => (
                        <SelectItem key={id} value={id} title={id}>
                          <span className="font-mono text-xs">
                            {id === currentOrgId ? `Your current org (${shortOrgId(id)})` : shortOrgId(id)}
                          </span>
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
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`org-${index}`}>Organisation</Label>
                    <Select
                      value={row.orgId || undefined}
                      onValueChange={(v) => updateRow(index, 'orgId', v)}
                    >
                      <SelectTrigger id={`org-${index}`} className="w-full bg-background/50">
                        <SelectValue placeholder="Select organisation or paste org_... ID" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredOrgIds.length === 0 && orgIdsForSelect.length === 0 && (
                          <SelectItem value="__none__" disabled>
                            {orgSearch ? 'No match — try another search or use Other' : 'No organisations yet'}
                          </SelectItem>
                        )}
                        {orgIdsForSelect.map((id) => (
                          <SelectItem key={id} value={id} title={id}>
                            <span className="font-mono text-xs">
                              {id === currentOrgId ? `Your current org (${shortOrgId(id)})` : shortOrgId(id)}
                            </span>
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
                  <Label htmlFor={`devices-${index}`}>
                    Device IDs
                    <span className="text-muted-foreground ml-1.5 font-normal text-xs">
                      (one per line or comma-separated)
                    </span>
                  </Label>
                  <textarea
                    id={`devices-${index}`}
                    className="min-h-[88px] w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g. TIP-001, TIP-003"
                    aria-describedby={`devices-hint-${index}`}
                    value={row.deviceIds}
                    onChange={(e) => updateRow(index, 'deviceIds', e.target.value)}
                  />
                  <p id={`devices-hint-${index}`} className="sr-only">
                    One per line or comma-separated, e.g. HL-001234, TIP-001
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={addRow} className="order-2 sm:order-1">
          <Plus className="mr-2 h-4 w-4" />
          Add another organisation
        </Button>
        <Button type="submit" disabled={loading} className="order-1 w-full sm:order-2 sm:w-auto">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Assign labels
        </Button>
      </div>
    </form>
  )
}
