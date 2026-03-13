'use client'

import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FieldInfoProps {
  text: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  maxWidth?: number
}

export function FieldInfo({
  text,
  side = 'top',
  maxWidth = 240,
}: FieldInfoProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} style={{ maxWidth }}>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  )
}
