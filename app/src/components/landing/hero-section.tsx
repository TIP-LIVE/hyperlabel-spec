'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'


const cities = [
  'Jakarta',
  'London',
  'Dubai',
  'Tokyo',
  'New York',
  'Singapore',
  'Sydney',
  'São Paulo',
  'Lagos',
  'Mumbai',
  'Shanghai',
  'Istanbul',
  'Seoul',
  'Cape Town',
  'Mexico City',
]

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Pause video when not visible for performance
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-black">
      {/* Video background — desktop only */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-40 max-md:hidden"
        poster="/videos/hero-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
      >
        <source src="/videos/hero-720p.mp4" type="video/mp4" />
      </video>

      {/* Mobile poster fallback */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 md:hidden"
        style={{ backgroundImage: 'url(/videos/hero-poster.jpg)' }}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 md:py-28">
        <h1 className="text-headline text-5xl text-white md:text-7xl lg:text-8xl">
          Door to Door
          <br />
          Cargo Tracking
        </h1>
        <p className="mt-6 max-w-lg text-body-brand text-lg text-gray-300 md:text-xl">
          Attach a tracking label to your shipment and follow it from pickup to
          delivery. Real-time visibility in 180+ countries — no scanners, no
          subscriptions.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button
            size="lg"
            className="h-12 rounded-full bg-[#00FF2B] px-8 text-base font-semibold text-black hover:bg-[#00DD25]"
            asChild
          >
            <Link href="/buy">Buy a Label</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-white/30 px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="#how-it-works">Learn More</Link>
          </Button>
        </div>

        {/* City marquee ticker */}
        <div className="mt-16 overflow-hidden">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#00FF2B]" />
            <span className="shrink-0 font-medium text-gray-400">Now tracking in</span>
          </div>
          <div className="relative mt-2">
            <div className="animate-marquee flex w-max items-center gap-6 text-lg font-semibold text-white/60">
              {[...cities, ...cities].map((city, i) => (
                <span key={`${city}-${i}`} className="whitespace-nowrap">
                  {city}
                  {i < cities.length * 2 - 1 && (
                    <span className="ml-6 text-white/20">&bull;</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
