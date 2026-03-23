'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function AddLeadForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    linkedIn: '',
    company: '',
    role: '',
    persona: '' as string,
    source: '',
    screeningNotes: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    if (!form.persona) {
      setError('Persona is required')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/admin/research/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create lead')
        return
      }

      router.push('/admin/research/leads')
    } catch {
      setError('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">New Lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Acme Logistics"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={form.role}
                onChange={(e) => updateField('role', e.target.value)}
                placeholder="Head of Supply Chain"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="persona">Persona *</Label>
              <Select
                value={form.persona}
                onValueChange={(v) => updateField('persona', v)}
              >
                <SelectTrigger id="persona">
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSIGNEE">Consignee / Buyer</SelectItem>
                  <SelectItem value="FORWARDER">Forwarder</SelectItem>
                  <SelectItem value="SHIPPER">Shipper / 3PL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select
                value={form.source}
                onValueChange={(v) => updateField('source', v)}
              >
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="cold-email">Cold Email</SelectItem>
                  <SelectItem value="respondent.io">Respondent.io</SelectItem>
                  <SelectItem value="personal-network">Personal Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="linkedIn">LinkedIn Profile URL</Label>
            <Input
              id="linkedIn"
              value={form.linkedIn}
              onChange={(e) => updateField('linkedIn', e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div>
            <Label htmlFor="screeningNotes">Screening Notes</Label>
            <Textarea
              id="screeningNotes"
              value={form.screeningNotes}
              onChange={(e) => updateField('screeningNotes', e.target.value)}
              placeholder="Initial notes about this person..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Lead
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
