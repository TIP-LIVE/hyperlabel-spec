'use client'

import { useEffect, useRef, useState } from 'react'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'

interface CountUpProps {
  end: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

export function CountUp({
  end,
  prefix = '',
  suffix = '',
  duration = 2000,
  className,
}: CountUpProps) {
  const { ref, isIntersecting } = useIntersectionObserver({ triggerOnce: true })
  const [count, setCount] = useState(0)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!isIntersecting || hasStarted.current) return
    hasStarted.current = true

    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [isIntersecting, end, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{count}{suffix}
    </span>
  )
}
