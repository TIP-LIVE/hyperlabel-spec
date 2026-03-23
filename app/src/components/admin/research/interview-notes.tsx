'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Quote, Lightbulb } from 'lucide-react'

export interface SectionNotes {
  [sectionTitle: string]: string
}

export interface KeyQuote {
  quote: string
  context: string
  theme: string
}

export interface HypothesisSignal {
  hypothesisId: string
  signal: 'validating' | 'neutral' | 'invalidating'
  evidence: string
}

interface Hypothesis {
  id: string
  code: string
  statement: string
}

interface InterviewNotesProps {
  sectionTitles: string[]
  notes: SectionNotes
  keyQuotes: KeyQuote[]
  hypothesisSignals: HypothesisSignal[]
  hypotheses: Hypothesis[]
  onNotesChange: (notes: SectionNotes) => void
  onQuotesChange: (quotes: KeyQuote[]) => void
  onSignalsChange: (signals: HypothesisSignal[]) => void
  activeSection: number
}

export function InterviewNotes({
  sectionTitles,
  notes,
  keyQuotes,
  hypothesisSignals,
  hypotheses,
  onNotesChange,
  onQuotesChange,
  onSignalsChange,
  activeSection,
}: InterviewNotesProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'quotes' | 'signals'>('notes')

  const currentSectionTitle = sectionTitles[activeSection] || ''

  function updateSectionNote(value: string) {
    onNotesChange({ ...notes, [currentSectionTitle]: value })
  }

  function addQuote() {
    onQuotesChange([...keyQuotes, { quote: '', context: currentSectionTitle, theme: '' }])
  }

  function updateQuote(index: number, field: keyof KeyQuote, value: string) {
    const updated = [...keyQuotes]
    updated[index] = { ...updated[index], [field]: value }
    onQuotesChange(updated)
  }

  function removeQuote(index: number) {
    onQuotesChange(keyQuotes.filter((_, i) => i !== index))
  }

  function addSignal() {
    const firstHypothesis = hypotheses[0]
    if (!firstHypothesis) return
    onSignalsChange([
      ...hypothesisSignals,
      { hypothesisId: firstHypothesis.code, signal: 'neutral', evidence: '' },
    ])
  }

  function updateSignal(index: number, field: keyof HypothesisSignal, value: string) {
    const updated = [...hypothesisSignals]
    updated[index] = { ...updated[index], [field]: value }
    onSignalsChange(updated)
  }

  function removeSignal(index: number) {
    onSignalsChange(hypothesisSignals.filter((_, i) => i !== index))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab Bar */}
      <div className="flex border-b border-border">
        {(['notes', 'quotes', 'signals'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'notes' && 'Notes'}
            {tab === 'quotes' && (
              <>
                <Quote className="h-3.5 w-3.5" />
                Quotes ({keyQuotes.length})
              </>
            )}
            {tab === 'signals' && (
              <>
                <Lightbulb className="h-3.5 w-3.5" />
                Signals ({hypothesisSignals.length})
              </>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentSectionTitle}
              </Badge>
            </div>
            <Textarea
              placeholder={`Notes for "${currentSectionTitle}"...`}
              value={notes[currentSectionTitle] || ''}
              onChange={(e) => updateSectionNote(e.target.value)}
              className="min-h-[300px] resize-none bg-card text-foreground"
            />
            {/* Quick view of all section notes */}
            {sectionTitles.length > 1 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">All sections:</p>
                {sectionTitles.map((title, i) => (
                  <div
                    key={title}
                    className={`rounded border p-2 text-xs ${
                      i === activeSection
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <span className="font-medium text-foreground">{title}:</span>{' '}
                    <span className="text-muted-foreground">
                      {notes[title]
                        ? notes[title].slice(0, 80) + (notes[title].length > 80 ? '...' : '')
                        : 'No notes'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="space-y-3">
            {keyQuotes.map((q, i) => (
              <Card key={i} className="border-border bg-card">
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Textarea
                      placeholder="Exact quote..."
                      value={q.quote}
                      onChange={(e) => updateQuote(i, 'quote', e.target.value)}
                      className="min-h-[60px] resize-none text-sm"
                      rows={2}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive"
                      onClick={() => removeQuote(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Context / section"
                      value={q.context}
                      onChange={(e) => updateQuote(i, 'context', e.target.value)}
                      className="text-xs"
                    />
                    <Input
                      placeholder="Theme (e.g. pain-point, pricing)"
                      value={q.theme}
                      onChange={(e) => updateQuote(i, 'theme', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={addQuote}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Quote
            </Button>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="space-y-3">
            {hypothesisSignals.map((s, i) => (
              <Card key={i} className="border-border bg-card">
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={s.hypothesisId}
                      onValueChange={(v) => updateSignal(i, 'hypothesisId', v)}
                    >
                      <SelectTrigger className="w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hypotheses.map((h) => (
                          <SelectItem key={h.code} value={h.code}>
                            {h.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={s.signal}
                      onValueChange={(v) => updateSignal(i, 'signal', v)}
                    >
                      <SelectTrigger className="w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="validating">Validating</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="invalidating">Invalidating</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-7 w-7 text-destructive"
                      onClick={() => removeSignal(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Evidence / what they said..."
                    value={s.evidence}
                    onChange={(e) => updateSignal(i, 'evidence', e.target.value)}
                    className="min-h-[40px] resize-none text-xs"
                    rows={2}
                  />
                  {/* Show hypothesis statement for context */}
                  <p className="text-xs text-muted-foreground">
                    {hypotheses.find((h) => h.code === s.hypothesisId)?.statement || ''}
                  </p>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" size="sm" onClick={addSignal} disabled={hypotheses.length === 0}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Signal
            </Button>
            {hypotheses.length === 0 && (
              <p className="text-xs text-muted-foreground">No hypotheses defined yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
