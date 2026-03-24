'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Download, Loader2 } from 'lucide-react'

export function LabelGeneratorForm() {
  const [count, setCount] = useState(10)
  const [startNumber, setStartNumber] = useState('')
  const [createDbRecords, setCreateDbRecords] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleGenerate() {
    if (count < 1 || count > 500) return

    setLoading(true)
    setResult(null)

    try {
      const body: Record<string, unknown> = { count, createDbRecords }
      if (startNumber) {
        body.startNumber = parseInt(startNumber)
      }

      const res = await fetch('/api/v1/admin/labels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const error = await res.json()
        setResult({
          success: false,
          message: error.stack ? `${error.error}\n${error.stack}` : (error.error || 'Generation failed'),
        })
        return
      }

      // Download the PDF
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const filename =
        res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
        `labels-${Date.now()}.pdf`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setResult({
        success: true,
        message: `Generated ${count} labels. PDF downloaded as ${filename}`,
      })
    } catch {
      setResult({
        success: false,
        message: 'Network error. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Label Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="count">Number of labels (1-500)</Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startNumber">Starting number (optional)</Label>
          <Input
            id="startNumber"
            type="number"
            placeholder="Auto-generate from timestamp"
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to auto-generate. Labels will be numbered sequentially from this value.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="createDb"
            checked={createDbRecords}
            onCheckedChange={setCreateDbRecords}
          />
          <Label htmlFor="createDb">Register labels in database (INVENTORY)</Label>
        </div>

        {result && (
          <div
            className={`rounded-md p-3 text-sm ${
              result.success
                ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {result.message}
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading || count < 1 || count > 500}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate & Download PDF
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
