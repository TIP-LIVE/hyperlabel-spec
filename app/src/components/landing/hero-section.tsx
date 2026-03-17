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
      <div className="container mx-auto grid min-h-[90vh] items-center gap-8 px-4 py-20 md:py-28 lg:grid-cols-2 lg:gap-12">
        {/* Left — text content */}
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Tracking with no blind zones
          </p>
          <h1 className="text-headline mt-4 text-5xl text-white md:text-7xl lg:text-8xl">
            Door to Door
            <br />
            Cargo Tracking
          </h1>
          <p className="mt-6 max-w-lg text-body-brand text-lg text-gray-300 md:text-xl">
            Stick a tracking label on your shipment and follow it from pickup to
            delivery. Real-time location, delivery alerts, shareable links — in
            180+ countries.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Button
              size="lg"
              className="h-14 rounded-full bg-[#00FF2B] px-10 text-base font-semibold text-black hover:bg-[#00DD25]"
              asChild
            >
              <Link href="/buy">Buy Labels</Link>
            </Button>
            <Link
              href="#how-it-works"
              className="text-base font-semibold text-white transition-colors hover:text-gray-300"
            >
              Learn More &gt;
            </Link>
          </div>
        </div>

        {/* Right — hero video in frame with tracking card overlay */}
        <div className="relative z-10">
          <div className="relative overflow-hidden rounded-2xl">
            {/* Video — desktop */}
            <video
              ref={videoRef}
              className="aspect-video w-full object-cover max-md:hidden"
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

            {/* Mobile — poster fallback */}
            <Image
              src="/videos/hero-poster.jpg"
              alt="TIP cargo tracking visualization"
              width={800}
              height={600}
              className="aspect-video w-full object-cover md:hidden"
              priority
            />

            {/* Tracking card overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg sm:bottom-6 sm:left-6 sm:right-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Image
                  src="/images/tip-label-3d.webp"
                  alt="TIP label"
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">Cargo Robbie 16</p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400">Route</p>
                    <p className="text-sm font-bold text-gray-900">Jakarta – London</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-gray-400">Estimated Arrival</p>
                    <p className="text-sm font-bold text-gray-900">
                      18:44 <span className="text-[#00FF2B]">4 Feb</span>
                    </p>
                  </div>
                </div>
              </div>
              <span className="absolute top-3 right-4 h-2.5 w-2.5 rounded-full bg-[#00FF2B]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
