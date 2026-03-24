'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
import { ArrowLeft, Check, MessageSquare } from 'lucide-react'
import { ResearchBreadcrumb } from './research-breadcrumb'
import {
  researchPersonaConfig,
  researchPersonaStyles,
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
  version: number
  createdAt: string
  updatedAt: string
}

interface EmailTemplateReviewProps {
  template: TemplateData
}

export function EmailTemplateReview({ template }: EmailTemplateReviewProps) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReview(action: 'approve' | 'request-changes') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin/research/email-templates/${template.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Review action failed')
      }
      router.push('/admin/research/email-templates')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ResearchBreadcrumb items={[
        { label: 'Email Templates', href: '/admin/research/email-templates' },
        { label: 'Review' },
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
            <h1 className="text-2xl font-bold text-foreground">
              {EMAIL_TYPE_LABELS[template.type]} Email Template
            </h1>
            <div className="mt-1 flex items-center gap-2">
              {template.persona ? (
                <Badge className={researchPersonaStyles[template.persona]}>
                  {researchPersonaConfig[template.persona].label}
                </Badge>
              ) : (
                <Badge variant="outline">All Personas</Badge>
              )}
              <span className="text-sm text-muted-foreground">v{template.version}</span>
            </div>
          </div>
        </div>
        <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
          Awaiting Review
        </Badge>
      </div>

      {/* Subject */}
      <Card className="p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Subject Line</h3>
        <p className="text-lg font-semibold text-foreground">{template.subject}</p>
      </Card>

      {/* Body */}
      <Card className="p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Email Body</h3>
        <div className="whitespace-pre-wrap text-sm text-foreground bg-muted/50 rounded-lg p-4">
          {template.body}
        </div>
      </Card>

      {/* Review action area */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Review Decision</h3>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-foreground">
            Notes (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add feedback or notes about the template..."
            className="mt-1"
            rows={4}
          />
        </div>

        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700" disabled={loading}>
                <Check className="mr-2 h-4 w-4" />
                Approve Template
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve this template?</AlertDialogTitle>
                <AlertDialogDescription>
                  The template will be marked as approved and can be used to send emails to leads.
                  The researcher will be notified.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleReview('approve')}>
                  Approve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Request Changes
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  The template will be returned to draft status. Your notes will be shared
                  with the researcher so they can make adjustments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleReview('request-changes')}>
                  Request Changes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  )
}
