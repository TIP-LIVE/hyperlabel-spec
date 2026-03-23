'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
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
    <section className="relative overflow-hidden bg-black">
      <div className="container mx-auto grid items-center gap-6 px-4 pt-4 pb-6 md:gap-8 md:pt-12 md:pb-16 lg:grid-cols-2 lg:gap-12">
        {/* Text content — below video on mobile, left on desktop */}
        <div className="relative z-10 order-2 lg:order-1">
          <p className="text-label-expanded hidden text-white/30 md:block">
            Tracking with no blind zones
          </p>
          <h1 className="text-headline text-[clamp(2.5rem,5vw,3.5rem)] text-white md:mt-6">
            Door to Door
            <br />
            Cargo Tracking
          </h1>
          <p className="mt-3 max-w-[485px] text-lg font-medium leading-normal tracking-tight text-white/70 md:mt-4">
            Stick a tracking label on your shipment and follow it from pickup to
            delivery. Real-time location, delivery alerts, shareable links — in
            180+ countries.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 md:mt-10">
            <Button
              size="lg"
              className="h-[68px] w-full rounded-full bg-[#00FF2B] px-10 text-[17px] font-semibold text-black hover:bg-[#00DD25] md:w-auto"
              asChild
            >
              <Link href="/buy">Buy Labels</Link>
            </Button>
            <Link
              href="#how-it-works"
              className="hidden text-[17px] font-semibold text-white transition-colors hover:text-gray-300 md:inline"
            >
              Learn More &gt;
            </Link>
          </div>
        </div>

        {/* Hero video — above text on mobile, right on desktop */}
        <div className="relative z-10 order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-[28px] aspect-square lg:max-h-[calc(100dvh-10rem)]">
            {/* Video — plays on all viewports */}
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              poster="/videos/hero-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            >
              {/* Mobile: 720p, Desktop: 1080p */}
              <source src="/videos/hero-720p.mp4" type="video/mp4" media="(max-width: 767px)" />
              <source src="/videos/hero-1080p.mp4" type="video/mp4" />
            </video>

          </div>
        </div>
      </div>
    </section>
  )
}
