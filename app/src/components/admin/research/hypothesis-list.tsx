'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Check, X, Minus, Pencil, Save } from 'lucide-react'

interface HypothesisData {
  id: string
  code: string
  statement: string
  successSignal: string
  validating: number
  neutral: number
  invalidating: number
  verdict: string | null
}

interface HypothesisListProps {
  hypotheses: HypothesisData[]
}

export function HypothesisList({ hypotheses: initialHypotheses }: HypothesisListProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVerdict, setEditVerdict] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSaveVerdict(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/admin/research/hypotheses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict: editVerdict || null }),
      })
      if (res.ok) {
        setEditingId(null)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateCount(id: string, field: 'validating' | 'neutral' | 'invalidating', delta: number) {
    const hypothesis = initialHypotheses.find((h) => h.id === id)
    if (!hypothesis) return

    const newValue = Math.max(0, hypothesis[field] + delta)
    await fetch(`/api/v1/admin/research/hypotheses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: newValue }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {initialHypotheses.map((h) => {
        const total = h.validating + h.neutral + h.invalidating
        const isEditing = editingId === h.id

        return (
          <Card key={h.id} className="p-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {h.code}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{h.statement}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Success: {h.successSignal}
                </p>

                {/* Signal counts */}
                <div className="mt-3 flex items-center gap-4">
                  <SignalCounter
                    icon={<Check className="h-3 w-3" />}
                    label="Validating"
                    count={h.validating}
                    color="text-green-600 dark:text-green-400"
                    bgColor="bg-green-500/20"
                    onIncrement={() => handleUpdateCount(h.id, 'validating', 1)}
                    onDecrement={() => handleUpdateCount(h.id, 'validating', -1)}
                  />
                  <SignalCounter
                    icon={<Minus className="h-3 w-3" />}
                    label="Neutral"
                    count={h.neutral}
                    color="text-gray-600 dark:text-gray-400"
                    bgColor="bg-gray-500/20"
                    onIncrement={() => handleUpdateCount(h.id, 'neutral', 1)}
                    onDecrement={() => handleUpdateCount(h.id, 'neutral', -1)}
                  />
                  <SignalCounter
                    icon={<X className="h-3 w-3" />}
                    label="Invalidating"
                    count={h.invalidating}
                    color="text-red-600 dark:text-red-400"
                    bgColor="bg-red-500/20"
                    onIncrement={() => handleUpdateCount(h.id, 'invalidating', 1)}
                    onDecrement={() => handleUpdateCount(h.id, 'invalidating', -1)}
                  />
                </div>

                {/* Signal bar */}
                {total > 0 && (
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted">
                    {h.validating > 0 && (
                      <div
                        className="bg-green-500"
                        style={{ width: `${(h.validating / total) * 100}%` }}
                      />
                    )}
                    {h.neutral > 0 && (
                      <div
                        className="bg-gray-400"
                        style={{ width: `${(h.neutral / total) * 100}%` }}
                      />
                    )}
                    {h.invalidating > 0 && (
                      <div
                        className="bg-red-500"
                        style={{ width: `${(h.invalidating / total) * 100}%` }}
                      />
                    )}
                  </div>
                )}

                {/* Verdict */}
                <div className="mt-2 flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        value={editVerdict}
                        onChange={(e) => setEditVerdict(e.target.value)}
                        placeholder="Verdict (e.g. VALIDATED, INCONCLUSIVE)"
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSaveVerdict(h.id)}
                        disabled={saving}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {h.verdict ? (
                        <Badge
                          className={
                            h.verdict === 'VALIDATED'
                              ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                              : h.verdict === 'INVALIDATED'
                                ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                          }
                        >
                          {h.verdict}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No verdict yet</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingId(h.id)
                          setEditVerdict(h.verdict || '')
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function SignalCounter({
  icon,
  label,
  count,
  color,
  bgColor,
  onIncrement,
  onDecrement,
}: {
  icon: React.ReactNode
  label: string
  count: number
  color: string
  bgColor: string
  onIncrement: () => void
  onDecrement: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={onDecrement}
        disabled={count === 0}
      >
        <Minus className="h-2.5 w-2.5" />
      </Button>
      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${bgColor} ${color}`}>
        {icon}
        <span className="font-medium">{count}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onIncrement}>
        <Check className="h-2.5 w-2.5" />
      </Button>
    </div>
  )
}
