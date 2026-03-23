'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail } from 'lucide-react'

const EMAIL_TYPE_OPTIONS = [
  { value: 'outreach', label: 'Outreach', description: 'Initial research invitation' },
  { value: 'scheduled', label: 'Scheduled', description: 'Interview confirmation' },
  { value: 'reminder', label: 'Reminder', description: '24h before interview' },
  { value: 'thank_you', label: 'Thank You', description: 'Post-interview thanks + gift card' },
  { value: 'referral', label: 'Referral', description: 'Referral request (48h after)' },
] as const

const DEFAULT_SUBJECTS: Record<string, string> = {
  outreach: "TIP Research \u2014 We'd love to hear your perspective",
  scheduled: 'Your interview with TIP is confirmed',
  reminder: 'Reminder: Your interview with TIP is tomorrow',
  thank_you: 'Thank you for your time \u2014 TIP Research',
  referral: "Know someone in logistics? We'd love an introduction",
}

interface SendEmailDialogProps {
  leadId: string
  leadName: string
  leadEmail: string | null
  trigger?: React.ReactNode
}

export function SendEmailDialog({
  leadId,
  leadName,
  leadEmail,
  trigger,
}: SendEmailDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [type, setType] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [customMessage, setCustomMessage] = useState('')

  function handleTypeChange(value: string) {
    setType(value)
    setSubject(DEFAULT_SUBJECTS[value] || '')
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/v1/admin/research/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          type,
          subject: subject || undefined,
          customMessage: customMessage || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to send email')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setType('')
        setSubject('')
        setCustomMessage('')
        setSuccess(false)
        router.refresh()
      }, 1500)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" disabled={!leadEmail}>
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Send Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Send Research Email</DialogTitle>
            <DialogDescription>
              Send an email to {leadName}
              {leadEmail ? ` (${leadEmail})` : ' — no email address on file'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="emailType">Email Type</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select email type..." />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type && (
              <>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="mt-1"
                  />
                </div>

                {type === 'outreach' && (
                  <div>
                    <Label htmlFor="customMessage">Custom Message (optional)</Label>
                    <Textarea
                      id="customMessage"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Add a personal touch to the outreach email..."
                      rows={4}
                      className="mt-1"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      If provided, this replaces the default outreach text.
                    </p>
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {success && (
              <p className="text-sm text-green-600">Email sent successfully!</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !type || !leadEmail}>
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
