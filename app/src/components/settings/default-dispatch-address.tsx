'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, MapPin } from 'lucide-react'

interface SavedAddress {
  id: string
  label: string
  name: string
  line1: string
  line2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
}

const NONE_VALUE = '__none__'

/**
 * Settings widget — lets an org admin pick a SavedAddress as the default
 * destination for new dispatches. The dispatch creation form pre-fills from
 * this address. Backed by POST /api/v1/org/default-dispatch-address.
 */
export function DefaultDispatchAddressSetting() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [initialId, setInitialId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [addrRes, defaultRes] = await Promise.all([
          fetch('/api/v1/addresses'),
          fetch('/api/v1/org/default-dispatch-address'),
        ])
        if (cancelled) return

        if (addrRes.ok) {
          const data = await addrRes.json()
          setAddresses(data.addresses ?? [])
        }
        if (defaultRes.ok) {
          const data = await defaultRes.json()
          const id = data.address?.id ?? null
          setSelectedId(id)
          setInitialId(id)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load default dispatch address')
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
    setSaving(true)
    try {
      const res = await fetch('/api/v1/org/default-dispatch-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savedAddressId: selectedId }),
      })
      if (res.ok) {
        setInitialId(selectedId)
        toast.success(
          selectedId
            ? 'Default dispatch address updated'
            : 'Default dispatch address cleared',
        )
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
        Loading default dispatch address…
      </div>
    )
  }

  const dirty = selectedId !== initialId
  const formatAddress = (a: SavedAddress) => {
    const title = a.label || a.name || a.line1
    return `${title} — ${a.city}, ${a.country}`
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <Label className="text-base">Default dispatch address</Label>
            <p className="text-sm text-muted-foreground">
              When set, the Label Dispatch form pre-fills with this address. You can still
              change it per-dispatch or use the &quot;ask the receiver&quot; flow.
            </p>
          </div>

          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no saved addresses yet.{' '}
              <Link
                href="/addresses"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Add one
              </Link>{' '}
              to set a default.
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={selectedId ?? NONE_VALUE}
                onValueChange={(v) => setSelectedId(v === NONE_VALUE ? null : v)}
              >
                <SelectTrigger className="w-full sm:max-w-sm">
                  <SelectValue placeholder="Choose a saved address" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No default</SelectItem>
                  {addresses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {formatAddress(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSave}
                disabled={!dirty || saving}
                size="sm"
                className="sm:shrink-0"
              >
                {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
