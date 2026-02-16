'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function OrgLabelSettings() {
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchSettings() {
      try {
        const res = await fetch('/api/v1/org-settings')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setAllowMultiple(data.allowLabelsInMultipleOrgs ?? false)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load organisation settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSettings()
    return () => { cancelled = true }
  }, [])

  async function handleToggle(checked: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/org-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowLabelsInMultipleOrgs: checked }),
      })
      if (res.ok) {
        setAllowMultiple(checked)
        toast.success(checked ? 'Labels can now be in multiple organisations' : 'Labels restricted to one organisation')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update')
      }
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label className="text-base">Allow labels in multiple organisations</Label>
        <p className="text-sm text-muted-foreground">
          When on, you can add a label to this organisation even if it is already in another. When off, adding a label that belongs to another org is blocked.
        </p>
      </div>
      <Switch
        checked={allowMultiple}
        onCheckedChange={handleToggle}
        disabled={saving}
      />
    </div>
  )
}
