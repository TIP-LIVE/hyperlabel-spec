'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle, X } from 'lucide-react'

interface ScannedLabelRowProps {
  displayId: string
  iccid: string
  onRemove: () => void
  disabled: boolean
}

export function ScannedLabelRow({ displayId, iccid, onRemove, disabled }: ScannedLabelRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
      <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
      <span className="font-mono text-sm text-foreground">{displayId}</span>
      <span className="font-mono text-xs text-muted-foreground">{iccid}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="ml-auto h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={disabled}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
