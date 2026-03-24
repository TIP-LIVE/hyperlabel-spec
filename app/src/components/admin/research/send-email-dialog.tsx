'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Mail, AlertTriangle } from 'lucide-react'

const EMAIL_TYPE_OPTIONS = [
  { value: 'outreach', label: 'Outreach', description: 'Initial research invitation' },
  { value: 'scheduled', label: 'Scheduled', description: 'Interview confirmation' },
  { value: 'reminder', label: 'Reminder', description: '24h before interview' },
  { value: 'thank_you', label: 'Thank You', description: 'Post-interview thanks + gift card' },
  { value: 'referral', label: 'Referral', description: 'Referral request (48h after)' },
] as const

interface ApprovedTemplate {
  id: string
  subject: string
  body: string
  persona: string | null
}

interface SendEmailDialogProps {
  leadId: string
  leadName: string
  leadEmail: string | null
  leadPersona: string
  trigger?: React.ReactNode
}

export function SendEmailDialog({
  leadId,
  leadName,
  leadEmail,
  leadPersona,
  trigger,
}: SendEmailDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [type, setType] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [approvedTemplate, setApprovedTemplate] = useState<ApprovedTemplate | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [noTemplate, setNoTemplate] = useState(false)

  useEffect(() => {
    if (!type) {
      setApprovedTemplate(null)
      setNoTemplate(false)
      return
    }

    setLoadingTemplate(true)
    setNoTemplate(false)
    setApprovedTemplate(null)

    fetch(`/api/v1/admin/research/email-templates?type=${type}&status=APPROVED`)
      .then((res) => res.json())
      .then((data) => {
        const templates = data.templates || []
        // Prefer persona-specific template, fallback to generic
        const match =
          templates.find((t: ApprovedTemplate) => t.persona === leadPersona) ||
          templates.find((t: ApprovedTemplate) => t.persona === null) ||
          templates[0]

        if (match) {
          setApprovedTemplate(match)
          setSubject(match.subject)
          setNoTemplate(false)
        } else {
          setNoTemplate(true)
          setSubject('')
        }
      })
      .catch(() => {
        setNoTemplate(true)
      })
      .finally(() => {
        setLoadingTemplate(false)
      })
  }, [type, leadPersona])

  function handleTypeChange(value: string) {
    setType(value)
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
        setApprovedTemplate(null)
        setNoTemplate(false)
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

            {type && !loadingTemplate && noTemplate && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">
                      No approved template
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      No approved email template found for this type.{' '}
                      <Link href="/admin/research/email-templates/new" className="text-primary hover:underline">
                        Create one
                      </Link>{' '}
                      and get it approved first.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {type && loadingTemplate && (
              <p className="text-sm text-muted-foreground">Loading template...</p>
            )}

            {type && approvedTemplate && (
              <>
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">Approved Template</Badge>
                    {approvedTemplate.persona ? (
                      <Badge variant="outline" className="text-xs">{approvedTemplate.persona}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">All Personas</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
                    {approvedTemplate.body}
                  </p>
                </div>

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
            <Button type="submit" disabled={loading || !type || !leadEmail || noTemplate || loadingTemplate}>
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
