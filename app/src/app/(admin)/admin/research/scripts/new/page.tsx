'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus } from 'lucide-react'

export default function NewScriptPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [persona, setPersona] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!title.trim() || !persona) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/research/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          persona,
          sections: [
            {
              title: 'Introduction',
              duration: 5,
              questions: [{ text: '', probes: [] }],
            },
          ],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create script')
      }

      const script = await res.json()
      router.push(`/admin/research/scripts/${script.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create script')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/research/scripts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Interview Script</h1>
      </div>

      <Card className="max-w-lg p-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-foreground">Script Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Consignee Interview Script v2"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Persona</label>
          <Select value={persona} onValueChange={setPersona}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONSIGNEE">Consignee</SelectItem>
              <SelectItem value="FORWARDER">Forwarder</SelectItem>
              <SelectItem value="SHIPPER">Shipper</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleCreate} disabled={submitting || !title.trim() || !persona}>
            <Plus className="mr-2 h-4 w-4" />
            {submitting ? 'Creating...' : 'Create Script'}
          </Button>
          <Link href="/admin/research/scripts">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
