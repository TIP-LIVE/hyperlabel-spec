'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  CheckCircle,
  Clock,
  Save,
} from 'lucide-react'
import { InterviewTimer } from './interview-timer'
import {
  InterviewNotes,
  type SectionNotes,
  type KeyQuote,
  type HypothesisSignal,
} from './interview-notes'
import {
  researchPersonaStyles,
  researchPersonaConfig,
} from '@/lib/status-config'
import type { ResearchPersona } from '@/lib/status-config'

interface ScriptSection {
  title: string
  duration: number
  questions: { text: string; probes: string[] }[]
}

interface InterviewData {
  id: string
  scheduledAt: string | null
  completedAt: string | null
  duration: number | null
  status: string
  notes: SectionNotes | null
  keyQuotes: KeyQuote[] | null
  hypothesisSignals: HypothesisSignal[] | null
  lead: {
    id: string
    name: string
    email: string | null
    company: string | null
    role: string | null
    persona: string
    screeningNotes: string | null
    pilotInterest: number | null
  }
}

interface ScriptData {
  id: string
  title: string
  persona: string
  sections: ScriptSection[]
  status: string
}

interface Hypothesis {
  id: string
  code: string
  statement: string
}

interface InterviewRunnerProps {
  interview: InterviewData
  script: ScriptData | null
  hypotheses: Hypothesis[]
}

export function InterviewRunner({ interview, script, hypotheses }: InterviewRunnerProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState(0)
  const [notes, setNotes] = useState<SectionNotes>(
    (interview.notes as SectionNotes) || {}
  )
  const [keyQuotes, setKeyQuotes] = useState<KeyQuote[]>(
    (interview.keyQuotes as KeyQuote[]) || []
  )
  const [hypothesisSignals, setHypothesisSignals] = useState<HypothesisSignal[]>(
    (interview.hypothesisSignals as HypothesisSignal[]) || []
  )
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCompleted = interview.status === 'COMPLETED'

  const sections: ScriptSection[] = script?.sections || []
  const sectionTitles = sections.map((s) => s.title)
  const currentSection = sections[activeSection]
  const totalDuration = sections.reduce((sum, s) => sum + s.duration, 0)

  const saveNotes = useCallback(
    async (notesData: SectionNotes, quotesData: KeyQuote[], signalsData: HypothesisSignal[]) => {
      setIsSaving(true)
      try {
        const res = await fetch(`/api/v1/admin/research/interviews/${interview.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: notesData,
            keyQuotes: quotesData,
            hypothesisSignals: signalsData,
            status: interview.status === 'SCHEDULED' ? 'IN_PROGRESS' : undefined,
          }),
        })
        if (res.ok) {
          setLastSaved(new Date())
        }
      } catch (err) {
        console.error('Failed to save notes:', err)
      } finally {
        setIsSaving(false)
      }
    },
    [interview.id, interview.status]
  )

  // Auto-save every 30 seconds when notes change
  const scheduleAutoSave = useCallback(() => {
    if (isCompleted) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      saveNotes(notes, keyQuotes, hypothesisSignals)
    }, 30000)
  }, [notes, keyQuotes, hypothesisSignals, saveNotes, isCompleted])

  useEffect(() => {
    scheduleAutoSave()
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [scheduleAutoSave])

  function handleNotesChange(newNotes: SectionNotes) {
    setNotes(newNotes)
  }

  function handleQuotesChange(newQuotes: KeyQuote[]) {
    setKeyQuotes(newQuotes)
  }

  function handleSignalsChange(newSignals: HypothesisSignal[]) {
    setHypothesisSignals(newSignals)
  }

  async function handleSave() {
    await saveNotes(notes, keyQuotes, hypothesisSignals)
  }

  async function handleComplete() {
    if (!confirm('Complete this interview? This will mark the lead as COMPLETED and trigger follow-up emails.')) return
    setIsCompleting(true)
    try {
      const res = await fetch(`/api/v1/admin/research/interviews/${interview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          notes,
          keyQuotes,
          hypothesisSignals,
        }),
      })
      if (res.ok) {
        router.push('/admin/research/interviews')
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to complete interview:', err)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/research/interviews"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{interview.lead.name}</h1>
              <Badge className={researchPersonaStyles[interview.lead.persona as ResearchPersona]}>
                {researchPersonaConfig[interview.lead.persona as ResearchPersona].label}
              </Badge>
              <Badge variant={isCompleted ? 'secondary' : 'outline'}>
                {interview.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {interview.lead.role && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {interview.lead.role}
                </span>
              )}
              {interview.lead.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {interview.lead.company}
                </span>
              )}
              {script && (
                <span className="text-muted-foreground">
                  Script: {script.title}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isCompleted && (
            <InterviewTimer targetMinutes={totalDuration || undefined} />
          )}
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  {isCompleting ? 'Completing...' : 'Complete'}
                </Button>
              </>
            )}
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content — Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Script */}
        <div className="flex w-1/2 flex-col border-r border-border">
          {/* Section Nav */}
          {sections.length > 0 && (
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                disabled={activeSection === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <div className="flex items-center gap-2">
                {sections.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSection(i)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === activeSection
                        ? 'bg-primary'
                        : notes[s.title]
                          ? 'bg-primary/40'
                          : 'bg-muted-foreground/30'
                    }`}
                    title={s.title}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection(Math.min(sections.length - 1, activeSection + 1))}
                disabled={activeSection === sections.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Script Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!script ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  No approved script found for {researchPersonaConfig[interview.lead.persona as ResearchPersona].label} persona.
                </p>
                <Link
                  href="/admin/research/scripts"
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Manage scripts
                </Link>
              </div>
            ) : currentSection ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {currentSection.title}
                  </h2>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {currentSection.duration}m
                  </div>
                </div>

                <div className="space-y-4">
                  {currentSection.questions.map((q, qi) => (
                    <Card key={qi} className="border-border bg-card">
                      <CardContent className="p-4">
                        <p className="font-medium text-foreground">{q.text}</p>
                        {q.probes.length > 0 && (
                          <div className="mt-2 space-y-1 border-l-2 border-muted pl-3">
                            {q.probes.map((probe, pi) => (
                              <p key={pi} className="text-sm text-muted-foreground">
                                {probe}
                              </p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Lead context (screening notes) — always visible at bottom */}
            {interview.lead.screeningNotes && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Screening Notes</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {interview.lead.screeningNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Notes */}
        <div className="flex w-1/2 flex-col">
          <InterviewNotes
            sectionTitles={sectionTitles}
            notes={notes}
            keyQuotes={keyQuotes}
            hypothesisSignals={hypothesisSignals}
            hypotheses={hypotheses}
            onNotesChange={handleNotesChange}
            onQuotesChange={handleQuotesChange}
            onSignalsChange={handleSignalsChange}
            activeSection={activeSection}
          />
        </div>
      </div>
    </div>
  )
}
