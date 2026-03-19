'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
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
      <div className="container mx-auto grid items-center gap-8 px-4 pt-8 pb-12 md:pt-12 md:pb-16 lg:grid-cols-2 lg:gap-12">
        {/* Left — text content */}
        <div className="relative z-10">
          <p className="text-label-expanded text-white/30">
            Tracking with no blind zones
          </p>
          <h1 className="text-headline mt-6 text-[clamp(2.5rem,5vw,3.5rem)] text-white">
            Door to Door
            <br />
            Cargo Tracking
          </h1>
          <p className="mt-4 max-w-[485px] text-lg font-medium leading-normal tracking-tight text-white/70">
            Stick a tracking label on your shipment and follow it from pickup to
            delivery. Real-time location, delivery alerts, shareable links — in
            180+ countries.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Button
              size="lg"
              className="h-[68px] rounded-full bg-[#00FF2B] px-10 text-[17px] font-semibold text-black hover:bg-[#00DD25]"
              asChild
            >
              <Link href="/buy">Buy Labels</Link>
            </Button>
            <Link
              href="#how-it-works"
              className="text-[17px] font-semibold text-white transition-colors hover:text-gray-300"
            >
              Learn More &gt;
            </Link>
          </div>
        </div>

        {/* Right — hero video with tracking card overlay */}
        <div className="relative z-10">
          <div className="relative overflow-hidden rounded-[28px] aspect-[4/3] md:aspect-square lg:max-h-[calc(100dvh-10rem)]">
            {/* Video — desktop */}
            <video
              ref={videoRef}
              className="h-full w-full object-cover max-md:hidden"
              poster="/videos/hero-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            >
              <source src="/videos/hero-1080p.mp4" type="video/mp4" />
            </video>

            {/* Mobile — poster fallback */}
            <Image
              src="/videos/hero-poster.jpg"
              alt="TIP cargo tracking visualization"
              width={800}
              height={800}
              className="h-full w-full object-cover md:hidden"
              priority
            />

          </div>
        </div>
      </div>
    </section>
  )
}
