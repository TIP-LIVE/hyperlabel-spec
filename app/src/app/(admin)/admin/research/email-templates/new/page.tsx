'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus } from 'lucide-react'

const DEFAULT_SUBJECTS: Record<string, string> = {
  outreach: "TIP Research — We'd love to hear your perspective",
  scheduled: 'Your interview with TIP is confirmed',
  reminder: 'Reminder: Your interview with TIP is tomorrow',
  thank_you: 'Thank you for your time — TIP Research',
  referral: "Know someone in logistics? We'd love an introduction",
}

export default function NewEmailTemplatePage() {
  const router = useRouter()
  const [type, setType] = useState('')
  const [persona, setPersona] = useState<string>('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTypeChange(value: string) {
    setType(value)
    setSubject(DEFAULT_SUBJECTS[value] || '')
  }

  async function handleCreate() {
    if (!type || !subject.trim() || !body.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/research/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          persona: persona === 'all' ? null : persona,
          subject: subject.trim(),
          body: body.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create template')
      }

      const template = await res.json()
      router.push(`/admin/research/email-templates/${template.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/research/email-templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Email Template</h1>
      </div>

      <Card className="max-w-lg p-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-foreground">Email Type</label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select email type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outreach">Outreach — Initial research invitation</SelectItem>
              <SelectItem value="scheduled">Scheduled — Interview confirmation</SelectItem>
              <SelectItem value="reminder">Reminder — 24h before interview</SelectItem>
              <SelectItem value="thank_you">Thank You — Post-interview thanks</SelectItem>
              <SelectItem value="referral">Referral — Referral request</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Persona (optional)</label>
          <Select value={persona} onValueChange={setPersona}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All personas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Personas</SelectItem>
              <SelectItem value="CONSIGNEE">Consignee</SelectItem>
              <SelectItem value="FORWARDER">Forwarder</SelectItem>
              <SelectItem value="SHIPPER">Shipper</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Leave as &quot;All Personas&quot; for a generic template, or select a specific persona for targeted messaging.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Subject Line</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Email Body</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the email body text..."
            className="mt-1 min-h-[150px]"
            rows={8}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            This text will replace the default body in the email template.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleCreate} disabled={submitting || !type || !subject.trim() || !body.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            {submitting ? 'Creating...' : 'Create Template'}
          </Button>
          <Link href="/admin/research/email-templates">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
