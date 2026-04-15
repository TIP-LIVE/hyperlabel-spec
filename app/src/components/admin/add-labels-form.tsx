'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

export function AddLabelsForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  // Single mode — IMEI is required; deviceId + displayId are derived
  // server-side via provisionLabel() (NNNNNYYYY format).
  const [imei, setImei] = useState('')
  const [iccid, setIccid] = useState('')

  // Bulk mode — CSV of imei,iccid
  const [bulkData, setBulkData] = useState('')

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/v1/admin/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels: [{ imei, iccid: iccid || undefined }],
        }),
      })

      const data = await res.json()
      if (res.ok) {
        const first = data.created?.[0]
        toast.success(first ? `Provisioned ${first.displayId}` : 'Label added to inventory')
        router.push('/admin/labels')
        router.refresh()
      } else {
        toast.error(data.error || 'Failed to add label')
      }
    } catch (error) {
      console.error('Error adding label:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // CSV: imei,iccid (one per line)
      const lines = bulkData.trim().split('\n')
      const labels = lines.map((line) => {
        const [imei, iccid] = line.split(',').map((s) => s.trim())
        return { imei, iccid: iccid || undefined }
      })

      const res = await fetch('/api/v1/admin/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels }),
      })

      const data = await res.json()
      if (res.ok) {
        const dupSuffix = data.duplicates?.length ? ` (${data.duplicates.length} duplicate IMEI skipped)` : ''
        toast.success(`Added ${data.count} labels to inventory${dupSuffix}`)
        router.push('/admin/labels')
        router.refresh()
      } else {
        toast.error(data.error || 'Failed to add labels')
      }
    } catch (error) {
      console.error('Error adding labels:', error)
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        Scan or type the modem&rsquo;s IMEI. The device ID and 9-digit display ID
        (<span className="font-mono">NNNNNYYYY</span>) are assigned automatically — they must come
        from the IMEI so the sticker QR, public tracking URL, and in-app identifiers all match.
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => setMode('single')}
          className={mode === 'single' ? '' : 'border-border text-muted-foreground'}
        >
          Single Label
        </Button>
        <Button
          type="button"
          variant={mode === 'bulk' ? 'default' : 'outline'}
          onClick={() => setMode('bulk')}
          className={mode === 'bulk' ? '' : 'border-border text-muted-foreground'}
        >
          Bulk Import
        </Button>
      </div>

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">IMEI *</Label>
            <Input
              placeholder="123456789012345"
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
              required
              inputMode="numeric"
              pattern="\d{15}"
              className="border-border bg-muted font-mono text-foreground"
            />
            <p className="text-xs text-muted-foreground">15 digits, from the modem&rsquo;s PCB QR.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">ICCID (Optional)</Label>
            <Input
              placeholder="8944..."
              value={iccid}
              onChange={(e) => setIccid(e.target.value)}
              className="border-border bg-muted text-foreground"
            />
          </div>
          <Button type="submit" disabled={loading || imei.length !== 15}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" />
            Add Label
          </Button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Bulk Import (CSV)</Label>
            <Textarea
              placeholder="imei,iccid&#10;123456789012345,8944...&#10;123456789012346,8944..."
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={10}
              className="border-border bg-muted font-mono text-sm text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              One label per line. Format: <span className="font-mono">imei,iccid</span> (ICCID
              optional). IMEI must be 15 digits.
            </p>
          </div>
          <Button type="submit" disabled={loading || !bulkData.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Labels
          </Button>
        </form>
      )}
    </div>
  )
}
