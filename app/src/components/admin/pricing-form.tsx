'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface PackRow {
  key: string
  name: string
  description: string
  quantity: number
  priceCents: number
  popular: boolean
}

interface PricingFormProps {
  initialPacks: PackRow[]
}

export function PricingForm({ initialPacks }: PricingFormProps) {
  const [packs, setPacks] = useState<PackRow[]>(initialPacks)
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>(
    Object.fromEntries(initialPacks.map((p) => [p.key, (p.priceCents / 100).toFixed(2)]))
  )
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const updatePack = (key: string, updates: Partial<PackRow>) => {
    setPacks((prev) => prev.map((p) => (p.key === key ? { ...p, ...updates } : p)))
  }

  const handlePriceChange = (key: string, value: string) => {
    setPriceInputs((prev) => ({ ...prev, [key]: value }))
    const dollars = parseFloat(value)
    if (!Number.isNaN(dollars) && dollars >= 0) {
      updatePack(key, { priceCents: Math.round(dollars * 100) })
    }
  }

  const handleTogglePopular = (key: string, checked: boolean) => {
    setPacks((prev) =>
      prev.map((p) => ({
        ...p,
        popular: p.key === key ? checked : checked ? false : p.popular,
      }))
    )
  }

  const handleSave = async (key: string) => {
    const pack = packs.find((p) => p.key === key)
    if (!pack) return

    const priceValue = parseFloat(priceInputs[key] ?? '')
    if (Number.isNaN(priceValue) || priceValue < 0) {
      toast.error('Enter a valid price')
      return
    }

    setSavingKey(key)
    try {
      const res = await fetch('/api/v1/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: pack.key,
          name: pack.name,
          description: pack.description,
          priceCents: Math.round(priceValue * 100),
          popular: pack.popular,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(err.error || 'Save failed')
      }
      const data = await res.json()
      if (pack.popular && data.pack) {
        // Reflect the server-side "only one popular" result locally
        setPacks((prev) => prev.map((p) => ({ ...p, popular: p.key === key })))
      }
      toast.success(`${pack.name} updated`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {packs.map((pack) => {
        const perLabel = pack.priceCents / pack.quantity / 100
        return (
          <Card key={pack.key} className="border-border bg-card">
            <CardHeader>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {pack.key}
              </div>
              <CardTitle className="text-card-foreground">
                {pack.quantity} label{pack.quantity > 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${pack.key}`}>Display name</Label>
                <Input
                  id={`name-${pack.key}`}
                  value={pack.name}
                  onChange={(e) => updatePack(pack.key, { name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`desc-${pack.key}`}>Description</Label>
                <Input
                  id={`desc-${pack.key}`}
                  value={pack.description}
                  onChange={(e) => updatePack(pack.key, { description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`price-${pack.key}`}>Price (USD)</Label>
                <Input
                  id={`price-${pack.key}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceInputs[pack.key] ?? ''}
                  onChange={(e) => handlePriceChange(pack.key, e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  ${perLabel.toFixed(2)} per label
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id={`popular-${pack.key}`}
                  checked={pack.popular}
                  onCheckedChange={(c) => handleTogglePopular(pack.key, c === true)}
                />
                <Label htmlFor={`popular-${pack.key}`} className="cursor-pointer">
                  Mark as &ldquo;Most Popular&rdquo;
                </Label>
              </div>
              <Button
                className="w-full"
                disabled={savingKey === pack.key}
                onClick={() => handleSave(pack.key)}
              >
                {savingKey === pack.key ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
