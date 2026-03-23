'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface InterviewTimerProps {
  onTimeUpdate?: (seconds: number) => void
  targetMinutes?: number
}

export function InterviewTimer({ onTimeUpdate, targetMinutes }: InterviewTimerProps) {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1
          onTimeUpdate?.(next)
          return next
        })
      }, 1000)
    } else {
      clearTimer()
    }
    return clearTimer
  }, [isRunning, clearTimer, onTimeUpdate])

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const targetSeconds = targetMinutes ? targetMinutes * 60 : undefined
  const isOverTime = targetSeconds ? seconds > targetSeconds : false

  return (
    <div className="flex items-center gap-3">
      <div
        className={`font-mono text-2xl font-bold tabular-nums ${
          isOverTime ? 'text-red-500' : 'text-foreground'
        }`}
      >
        {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      {targetMinutes && (
        <span className="text-sm text-muted-foreground">/ {targetMinutes}m</span>
      )}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setIsRunning(false)
            setSeconds(0)
            onTimeUpdate?.(0)
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
