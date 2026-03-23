'use client'

import { useState, useCallback } from 'react'
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
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  AlertCircle,
} from 'lucide-react'
import {
  scriptStatusConfig,
  scriptStatusStyles,
  researchPersonaConfig,
  researchPersonaStyles,
  type ScriptStatus,
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
  status: ScriptStatus
  version: number
  sections: Section[]
  reviewedBy: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

interface ScriptEditorProps {
  script: ScriptData
}

export function ScriptEditor({ script }: ScriptEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(script.title)
  const [sections, setSections] = useState<Section[]>(script.sections)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReadOnly = script.status === 'APPROVED' || script.status === 'ARCHIVED' || script.status === 'IN_REVIEW'
  const hasChangesRequested = script.status === 'DRAFT' && script.reviewNotes

  const totalDuration = sections.reduce((sum, s) => sum + s.duration, 0)
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0)

  const updateSection = useCallback((idx: number, updates: Partial<Section>) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)))
  }, [])

  const addSection = useCallback(() => {
    setSections((prev) => [...prev, { title: '', duration: 5, questions: [] }])
  }, [])

  const removeSection = useCallback((idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const moveSection = useCallback((idx: number, direction: 'up' | 'down') => {
    setSections((prev) => {
      const next = [...prev]
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }, [])

  const addQuestion = useCallback((sectionIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? { ...s, questions: [...s.questions, { text: '', probes: [] }] }
          : s
      )
    )
  }, [])

  const updateQuestion = useCallback((sectionIdx: number, qIdx: number, text: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              questions: s.questions.map((q, j) => (j === qIdx ? { ...q, text } : q)),
            }
          : s
      )
    )
  }, [])

  const removeQuestion = useCallback((sectionIdx: number, qIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? { ...s, questions: s.questions.filter((_, j) => j !== qIdx) }
          : s
      )
    )
  }, [])

  const addProbe = useCallback((sectionIdx: number, qIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              questions: s.questions.map((q, j) =>
                j === qIdx ? { ...q, probes: [...q.probes, ''] } : q
              ),
            }
          : s
      )
    )
  }, [])

  const updateProbe = useCallback((sectionIdx: number, qIdx: number, pIdx: number, text: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              questions: s.questions.map((q, j) =>
                j === qIdx
                  ? { ...q, probes: q.probes.map((p, k) => (k === pIdx ? text : p)) }
                  : q
              ),
            }
          : s
      )
    )
  }, [])

  const removeProbe = useCallback((sectionIdx: number, qIdx: number, pIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              questions: s.questions.map((q, j) =>
                j === qIdx ? { ...q, probes: q.probes.filter((_, k) => k !== pIdx) } : q
              ),
            }
          : s
      )
    )
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin/research/scripts/${script.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sections }),
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
      const saveRes = await fetch(`/api/v1/admin/research/scripts/${script.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sections }),
      })
      if (!saveRes.ok) {
        const data = await saveRes.json()
        throw new Error(data.error || 'Failed to save before submitting')
      }

      // Then submit for review
      const res = await fetch(`/api/v1/admin/research/scripts/${script.id}/review`, {
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
      const res = await fetch(`/api/v1/admin/research/scripts/${script.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      router.push('/admin/research/scripts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
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
            <div className="flex items-center gap-2">
              <Badge className={researchPersonaStyles[script.persona]}>
                {researchPersonaConfig[script.persona].label}
              </Badge>
              <Badge className={scriptStatusStyles[script.status]}>
                {scriptStatusConfig[script.status].label}
              </Badge>
              <span className="text-sm text-muted-foreground">v{script.version}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {sections.length} sections &middot; {totalQuestions} questions &middot; {totalDuration} min total
            </p>
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
                      This will save the script and send a review request email to Andrii Pavlov.
                      The script will be locked for editing until the review is complete.
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
          {script.status === 'IN_REVIEW' && (
            <Link href={`/admin/research/scripts/${script.id}/review`}>
              <Button>Open Review Page</Button>
            </Link>
          )}
          {(script.status === 'DRAFT' || script.status === 'ARCHIVED') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this script?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The script and all its content will be permanently deleted.
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
              <p className="mt-1 text-sm text-foreground">{script.reviewNotes}</p>
              {script.reviewedBy && (
                <p className="mt-1 text-xs text-muted-foreground">
                  — {script.reviewedBy}, {script.reviewedAt ? new Date(script.reviewedAt).toLocaleDateString() : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          {script.status === 'APPROVED' && 'This script is approved and cannot be edited.'}
          {script.status === 'ARCHIVED' && 'This script is archived.'}
          {script.status === 'IN_REVIEW' && 'This script is in review and cannot be edited until the review is complete.'}
        </div>
      )}

      {/* Title */}
      <Card className="p-4">
        <label className="text-sm font-medium text-foreground">Script Title</label>
        {isReadOnly ? (
          <p className="mt-1 text-lg font-semibold text-foreground">{title}</p>
        ) : (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
            placeholder="e.g. Consignee Interview Script v2"
          />
        )}
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sIdx) => (
          <Card key={sIdx} className="p-4">
            <div className="flex items-start gap-3">
              {/* Drag handle / reorder area */}
              {!isReadOnly && (
                <div className="flex flex-col items-center gap-1 pt-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSection(sIdx, 'up')}
                    disabled={sIdx === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSection(sIdx, 'down')}
                    disabled={sIdx === sections.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex-1 space-y-3">
                {/* Section header */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{sIdx + 1}.</span>
                  {isReadOnly ? (
                    <span className="font-medium text-foreground">{section.title}</span>
                  ) : (
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                      placeholder="Section title"
                      className="flex-1"
                    />
                  )}
                  {isReadOnly ? (
                    <span className="text-sm text-muted-foreground">{section.duration} min</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={section.duration}
                        onChange={(e) =>
                          updateSection(sIdx, { duration: parseInt(e.target.value) || 0 })
                        }
                        className="w-16"
                        min={0}
                        max={120}
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                  )}
                  {!isReadOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeSection(sIdx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Questions */}
                <div className="space-y-3 pl-6">
                  {section.questions.map((question, qIdx) => (
                    <div key={qIdx} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 text-xs text-muted-foreground font-mono">
                          Q{qIdx + 1}
                        </span>
                        {isReadOnly ? (
                          <p className="flex-1 text-sm text-foreground">{question.text}</p>
                        ) : (
                          <Textarea
                            value={question.text}
                            onChange={(e) => updateQuestion(sIdx, qIdx, e.target.value)}
                            placeholder="Question text"
                            className="flex-1 min-h-[60px]"
                            rows={2}
                          />
                        )}
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0"
                            onClick={() => removeQuestion(sIdx, qIdx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Probes */}
                      {question.probes.length > 0 && (
                        <div className="ml-8 space-y-1">
                          <span className="text-xs text-muted-foreground font-medium">Probes:</span>
                          {question.probes.map((probe, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">&rarr;</span>
                              {isReadOnly ? (
                                <p className="text-sm text-muted-foreground">{probe}</p>
                              ) : (
                                <Input
                                  value={probe}
                                  onChange={(e) => updateProbe(sIdx, qIdx, pIdx, e.target.value)}
                                  placeholder="Follow-up probe"
                                  className="flex-1 h-8 text-sm"
                                />
                              )}
                              {!isReadOnly && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeProbe(sIdx, qIdx, pIdx)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!isReadOnly && (
                        <div className="ml-8">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => addProbe(sIdx, qIdx)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Probe
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {!isReadOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addQuestion(sIdx)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Question
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!isReadOnly && (
          <Button variant="outline" className="w-full" onClick={addSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        )}
      </div>
    </div>
  )
}
