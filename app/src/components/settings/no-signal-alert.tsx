'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, BellOff } from 'lucide-react'

const DEFAULT_HOURS = 48
const MIN_HOURS = 2
const MAX_HOURS = 720

export function NoSignalAlertSetting() {
  const [value, setValue] = useState<number>(DEFAULT_HOURS)
  const [initial, setInitial] = useState<number>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/v1/org-settings')
        if (res.ok && !cancelled) {
          const data = await res.json()
          const hours = data.noSignalHours ?? DEFAULT_HOURS
          setValue(hours)
          setInitial(hours)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load alert settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    if (value < MIN_HOURS || value > MAX_HOURS) {
      toast.error(`Enter a value between ${MIN_HOURS} and ${MAX_HOURS} hours`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/v1/org-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noSignalHours: value }),
      })
      if (res.ok) {
        setInitial(value)
        toast.success(`No-signal alerts will fire after ${value} hours`)
      } else {
        const data = await res.json().catch(() => ({}))
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
      <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading alert settings…
      </div>
    )
  }

  const dirty = value !== initial
  const invalid = value < MIN_HOURS || value > MAX_HOURS

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <BellOff className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <Label className="text-base">No-signal alert threshold</Label>
            <p className="text-sm text-muted-foreground">
              Send an email when a tracking label hasn&apos;t reported for this
              many hours. Alerts are evaluated once per day at 08:00 UTC, so
              the actual delay can be up to 24 hours longer than this
              threshold. Default: 48 hours.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={value}
                min={MIN_HOURS}
                max={MAX_HOURS}
                step={1}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-24"
                aria-label="Hours"
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
            <Button
              onClick={handleSave}
              disabled={!dirty || invalid || saving}
              size="sm"
              className="sm:shrink-0"
            >
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
