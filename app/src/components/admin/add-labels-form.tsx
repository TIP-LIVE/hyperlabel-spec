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

  // Single mode
  const [deviceId, setDeviceId] = useState('')
  const [imei, setImei] = useState('')
  const [iccid, setIccid] = useState('')

  // Bulk mode
  const [bulkData, setBulkData] = useState('')

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/v1/admin/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels: [{ deviceId, imei: imei || undefined, iccid: iccid || undefined }],
        }),
      })

      if (res.ok) {
        toast.success('Label added to inventory')
        router.push('/admin/labels')
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add label')
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
      // Parse bulk data (CSV format: deviceId,imei,iccid)
      const lines = bulkData.trim().split('\n')
      const labels = lines.map((line) => {
        const [deviceId, imei, iccid] = line.split(',').map((s) => s.trim())
        return { deviceId, imei: imei || undefined, iccid: iccid || undefined }
      })

      const res = await fetch('/api/v1/admin/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Added ${data.count} labels to inventory`)
        router.push('/admin/labels')
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add labels')
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
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => setMode('single')}
          className={mode === 'single' ? '' : 'border-gray-700 text-gray-400'}
        >
          Single Label
        </Button>
        <Button
          type="button"
          variant={mode === 'bulk' ? 'default' : 'outline'}
          onClick={() => setMode('bulk')}
          className={mode === 'bulk' ? '' : 'border-gray-700 text-gray-400'}
        >
          Bulk Import
        </Button>
      </div>

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Device ID *</Label>
            <Input
              placeholder="HL-001234"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
              className="border-gray-700 bg-gray-800 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">IMEI (Optional)</Label>
            <Input
              placeholder="123456789012345"
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">ICCID (Optional)</Label>
            <Input
              placeholder="8944..."
              value={iccid}
              onChange={(e) => setIccid(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white"
            />
          </div>
          <Button type="submit" disabled={loading || !deviceId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" />
            Add Label
          </Button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Bulk Import (CSV)</Label>
            <Textarea
              placeholder="deviceId,imei,iccid&#10;HL-001234,123456789012345,8944...&#10;HL-001235,123456789012346,8944..."
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={10}
              className="border-gray-700 bg-gray-800 font-mono text-sm text-white"
            />
            <p className="text-xs text-gray-500">
              One label per line. Format: deviceId,imei,iccid (imei and iccid optional)
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
