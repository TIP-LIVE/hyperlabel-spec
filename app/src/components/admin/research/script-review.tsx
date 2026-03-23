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
import { ArrowLeft, Check, MessageSquare, Clock, FileText } from 'lucide-react'
import {
  researchPersonaConfig,
  researchPersonaStyles,
  type ResearchPersona,
} from '@/lib/status-config'

interface Question {
  text: string
  probes: string[]
}

interface Section {
  title: string
  duration: number
  questions: Question[]
}

interface ScriptData {
  id: string
  title: string
  persona: ResearchPersona
  version: number
  sections: Section[]
  createdAt: string
  updatedAt: string
}

interface ScriptReviewProps {
  script: ScriptData
}

export function ScriptReview({ script }: ScriptReviewProps) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalDuration = script.sections.reduce((sum, s) => sum + s.duration, 0)
  const totalQuestions = script.sections.reduce((sum, s) => sum + s.questions.length, 0)

  async function handleReview(action: 'approve' | 'request-changes') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin/research/scripts/${script.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Review action failed')
      }
      router.push('/admin/research/scripts')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/research/scripts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{script.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge className={researchPersonaStyles[script.persona]}>
                {researchPersonaConfig[script.persona].label}
              </Badge>
              <span className="text-sm text-muted-foreground">v{script.version}</span>
              <span className="text-sm text-muted-foreground">&middot;</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {totalQuestions} questions
              </span>
              <span className="text-sm text-muted-foreground">&middot;</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                ~{totalDuration} min
              </span>
            </div>
          </div>
        </div>
        <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
          Awaiting Review
        </Badge>
      </div>

      {/* Script sections (read-only) */}
      <div className="space-y-4">
        {script.sections.map((section, sIdx) => (
          <Card key={sIdx} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">
                {sIdx + 1}. {section.title}
              </h3>
              <span className="text-sm text-muted-foreground">{section.duration} min</span>
            </div>
            <div className="space-y-3">
              {section.questions.map((question, qIdx) => (
                <div key={qIdx} className="pl-4 border-l-2 border-border">
                  <p className="text-sm text-foreground">{question.text}</p>
                  {question.probes.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {question.probes.map((probe, pIdx) => (
                        <p key={pIdx} className="text-xs text-muted-foreground pl-3">
                          &rarr; {probe}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

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
            placeholder="Add feedback or notes about the script..."
            className="mt-1"
            rows={4}
          />
        </div>

        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700" disabled={loading}>
                <Check className="mr-2 h-4 w-4" />
                Approve Script
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve this script?</AlertDialogTitle>
                <AlertDialogDescription>
                  The script will be marked as approved and can be used in interviews.
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
                  The script will be returned to draft status. Your notes will be shared
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
