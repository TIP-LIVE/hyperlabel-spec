'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The 6 eye SVG frames — white circle with a black pupil in different positions.
 * Each frame is a simple inline SVG for zero-latency animation.
 */
const eyeFrames = [
  // eye-01: centered pupil (circle r=6.55)
  <svg key="e1" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
    <circle cx="22.12" cy="11.85" r="6.55" fill="black" />
  </svg>,
  // eye-02: large centered pupil (circle r=10)
  <svg key="e2" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
    <circle cx="17" cy="17" r="10" fill="black" />
  </svg>,
  // eye-03: small pupil (circle r=4.5)
  <svg key="e3" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
    <circle cx="17" cy="17" r="4.5" fill="black" />
  </svg>,
  // eye-04: horizontal ellipse (blink)
  <svg key="e4" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
    <ellipse cx="17.5" cy="17" rx="10.5" ry="2" fill="black" />
  </svg>,
  // eye-05: large centered (same as 02)
  <svg key="e5" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
    <circle cx="17" cy="17" r="10" fill="black" />
  </svg>,
  // eye-06: vertical ellipse
  <svg key="e6" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
    <ellipse cx="17" cy="17" rx="4" ry="10.5" fill="black" />
  </svg>,
]

// Animation sequence: look around, then blink, then hold
const animationSequence = [0, 0, 2, 5, 1, 1, 3, 1, 0, 0, 2, 2, 5, 0, 3, 0]

interface AnimatedEyeLogoProps {
  className?: string
}

export function AnimatedEyeLogo({ className }: AnimatedEyeLogoProps) {
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % animationSequence.length
      setFrameIndex(animationSequence[idx])
    }, 400)

    return () => clearInterval(interval)
  }, [])

  return (
    <span className={cn('inline-block', className)} aria-hidden="true">
      {eyeFrames[frameIndex]}
    </span>
  )
}
