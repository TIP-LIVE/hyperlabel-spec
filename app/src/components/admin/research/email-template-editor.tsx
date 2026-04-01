'use client'

import { useState } from 'react'
import { formatDateTime } from '@/lib/utils/format-date'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Save, Send, Trash2, AlertCircle } from 'lucide-react'
import { ResearchBreadcrumb } from './research-breadcrumb'
import {
  scriptStatusConfig,
  scriptStatusStyles,
  researchPersonaConfig,
  researchPersonaStyles,
  type ScriptStatus,
  type ResearchPersona,
} from '@/lib/status-config'

const EMAIL_TYPE_LABELS: Record<string, string> = {
  outreach: 'Outreach',
  scheduled: 'Scheduled',
  reminder: 'Reminder',
  thank_you: 'Thank You',
  referral: 'Referral',
}

interface TemplateData {
  id: string
  type: string
  persona: ResearchPersona | null
  subject: string
  body: string
  status: ScriptStatus
  version: number
  reviewedBy: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

interface EmailTemplateEditorProps {
  template: TemplateData
}

export function EmailTemplateEditor({ template }: EmailTemplateEditorProps) {
  const router = useRouter()
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReadOnly = template.status === 'APPROVED' || template.status === 'ARCHIVED' || template.status === 'IN_REVIEW'
  const hasChangesRequested = template.status === 'DRAFT' && template.reviewNotes

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin/research/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitForReview() {
    setSubmitting(true)
    setError(null)
    try {
      // Save first
      const saveRes = await fetch(`/api/v1/admin/research/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      if (!saveRes.ok) {
        const data = await saveRes.json()
        throw new Error(data.error || 'Failed to save before submitting')
      }

      // Then submit for review
      const res = await fetch(`/api/v1/admin/research/email-templates/${template.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit for review')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/v1/admin/research/email-templates/${template.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      router.push('/admin/research/email-templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <ResearchBreadcrumb items={[
        { label: 'Email Templates', href: '/admin/research/email-templates' },
        { label: EMAIL_TYPE_LABELS[template.type] || template.type },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/research/email-templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{EMAIL_TYPE_LABELS[template.type]}</Badge>
              {template.persona ? (
                <Badge className={researchPersonaStyles[template.persona]}>
                  {researchPersonaConfig[template.persona].label}
                </Badge>
              ) : (
                <Badge variant="outline">All Personas</Badge>
              )}
              <Badge className={scriptStatusStyles[template.status]}>
                {scriptStatusConfig[template.status].label}
              </Badge>
              <span className="text-sm text-muted-foreground">v{template.version}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={submitting}>
                    <Send className="mr-2 h-4 w-4" />
                    Submit for Review
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit for CEO Review?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will save the template and send a review request email to Andrii Pavlov.
                      The template will be locked for editing until the review is complete.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitForReview}>
                      {submitting ? 'Submitting...' : 'Submit'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {template.status === 'IN_REVIEW' && (
            <Link href={`/admin/research/email-templates/${template.id}/review`}>
              <Button>Open Review Page</Button>
            </Link>
          )}
          {(template.status === 'DRAFT' || template.status === 'ARCHIVED') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The template will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Review feedback banner */}
      {hasChangesRequested && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div>
              <p className="font-medium text-yellow-600 dark:text-yellow-400">Changes Requested</p>
              <p className="mt-1 text-sm text-foreground">{template.reviewNotes}</p>
              {template.reviewedBy && (
                <p className="mt-1 text-xs text-muted-foreground">
                  — {template.reviewedBy}, {template.reviewedAt ? formatDateTime(template.reviewedAt) : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          {template.status === 'APPROVED' && 'This template is approved and cannot be edited.'}
          {template.status === 'ARCHIVED' && 'This template is archived.'}
          {template.status === 'IN_REVIEW' && 'This template is in review and cannot be edited until the review is complete.'}
        </div>
      )}

      {/* Subject */}
      <Card className="p-4">
        <label className="text-sm font-medium text-foreground">Subject Line</label>
        {isReadOnly ? (
          <p className="mt-1 text-lg font-semibold text-foreground">{subject}</p>
        ) : (
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1"
            placeholder="Email subject line..."
          />
        )}
      </Card>

      {/* Body */}
      <Card className="p-4">
        <label className="text-sm font-medium text-foreground">Email Body</label>
        <p className="text-xs text-muted-foreground mt-0.5">
          This text replaces the default body in the email template. Use line breaks for paragraphs.
        </p>
        {isReadOnly ? (
          <div className="mt-2 whitespace-pre-wrap text-sm text-foreground bg-muted/50 rounded-lg p-4">
            {body}
          </div>
        ) : (
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-2 min-h-[200px]"
            placeholder="Write the email body text..."
            rows={10}
          />
        )}
      </Card>
    </div>
  )
}
