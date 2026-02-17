'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Loader2, PackagePlus, Settings2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

/**
 * Parses device IDs from text: one per line or comma-separated.
 */
function parseDeviceIds(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

export function AddExistingLabelsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conflictDeviceIds, setConflictDeviceIds] = useState<string[] | null>(null)
  const [skippedDueToStatus, setSkippedDueToStatus] = useState<string[] | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const deviceIds = parseDeviceIds(input)
    if (deviceIds.length === 0) {
      toast.error('Enter at least one device ID (e.g. HL-001234)')
      return
    }
    if (deviceIds.length > 100) {
      toast.error('Maximum 100 labels per request')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/v1/labels/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIds }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409 && data.deviceIds?.length) {
          setConflictDeviceIds(data.deviceIds)
        } else {
          toast.error(data.error || 'Failed to register labels')
        }
        return
      }

      setConflictDeviceIds(null)
      if (data.registered > 0) {
        setSkippedDueToStatus(null)
        toast.success(`${data.registered} label(s) added to your organisation`)
        setInput('')
        onOpenChange(false)
        router.refresh()
      } else {
        if (data.skippedDueToStatus?.length) {
          setSkippedDueToStatus(data.skippedDueToStatus)
        } else {
          setSkippedDueToStatus(null)
          toast.info(data.message || 'No new labels to register.')
          if (data.alreadyInOrg?.length) {
            setInput('')
            onOpenChange(false)
            router.refresh()
          }
        }
      }
    } catch {
      toast.error('Failed to register labels')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setConflictDeviceIds(null)
          setSkippedDueToStatus(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add existing labels</DialogTitle>
          <DialogDescription>
            Enter the device IDs of tracking labels you already have (e.g. HL-001234). They will be
            added to this organisation and appear under Total Labels. One per line or
            comma-separated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {conflictDeviceIds?.length ? (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
              >
                <p className="font-medium">Labels are in another organisation</p>
                <p className="mt-1 text-muted-foreground">
                  To add {conflictDeviceIds.length === 1 ? 'this label' : 'these labels'} here, turn
                  on &quot;Allow labels in multiple organisations&quot; in organisation settings.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => {
                    onOpenChange(false)
                    router.push('/settings/organization')
                  }}
                >
                  <Settings2 className="h-4 w-4" />
                  Open organisation settings
                </Button>
              </div>
            ) : null}
            {skippedDueToStatus?.length ? (
              <div
                role="alert"
                className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-200"
              >
                <p className="font-medium">Labels exist but are in use</p>
                <p className="mt-1 text-muted-foreground">
                  {skippedDueToStatus.length === 1 ? 'This label' : 'These labels'} are ACTIVE or
                  DEPLETED. Only INVENTORY or SOLD labels can be added here. To see all labels in the
                  database, open Admin → Labels.
                </p>
                <Button variant="secondary" size="sm" className="mt-3 gap-2" asChild>
                  <Link href="/admin/labels" onClick={() => onOpenChange(false)}>
                    <ShieldCheck className="h-4 w-4" />
                    View all labels (Admin)
                  </Link>
                </Button>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="device-ids">Device IDs</Label>
              <textarea
                id="device-ids"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={'HL-001234\nHL-001235\nHL-001236'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add labels
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddExistingLabelsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <PackagePlus className="mr-2 h-4 w-4" />
        Add existing labels
      </Button>
      <AddExistingLabelsDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
