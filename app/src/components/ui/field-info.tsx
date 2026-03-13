'use client'

import { Info } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

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
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        className="w-auto max-w-60 px-3 py-1.5 text-xs"
        style={{ maxWidth }}
      >
        <p>{text}</p>
      </PopoverContent>
    </Popover>
  )
}
