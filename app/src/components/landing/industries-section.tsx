'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

const industries = [
  {
    title: 'Electronics',
    desc: 'Phones, laptops, server parts — high-value cargo that needs tracking from factory to warehouse.',
    image: '/images/tip-electronics.webp',
  },
  {
    title: 'Pharma & Healthcare',
    desc: 'Medical equipment and pharmaceutical shipments where delivery accountability is critical.',
    image: '/images/tip-pharma-healthcare.webp',
  },
  {
    title: 'Art & Collectibles',
    desc: 'One-of-a-kind items moving between galleries, auctions, and private buyers worldwide.',
    image: '/images/tip-art-collectibles.webp',
  },
  {
    title: 'Air Cargo & Freight',
    desc: 'Time-critical shipments over 500 kg where carrier tracking alone isn\u2019t enough.',
    image: '/images/tip-air-cargo-freight.webp',
  },
]

export function IndustriesSection() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % industries.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const interval = setInterval(next, 3000)
    return () => clearInterval(interval)
  }, [paused, next])

  return (
    <section className="bg-[#0A0A0A] py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid items-start gap-10 lg:grid-cols-[575px_1fr]">
          {/* Left — large image, switches on active */}
          <div className="relative overflow-hidden rounded-[30px] aspect-square">
            {industries.map((industry, i) => (
              <Image
                key={industry.title}
                src={industry.image}
                alt={industry.title}
                width={1200}
                height={1200}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                  i === active ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>

          {/* Right — title + industry grid */}
          <div>
            <h2 className="text-headline text-4xl text-white md:text-[55px]">
              Businesses heavily benefiting from TIP
            </h2>
            <p className="mt-3 max-w-[243px] text-sm font-semibold leading-tight tracking-tight text-white/30">
              Any business that ships valuable cargo and needs visibility from origin to destination.
            </p>

            <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {industries.map((industry, i) => (
                <button
                  key={industry.title}
                  type="button"
                  onClick={() => {
                    setActive(i)
                    setPaused(true)
                    setTimeout(() => setPaused(false), 5000)
                  }}
                  className={`cursor-pointer text-left transition-opacity duration-300 ${
                    i === active ? 'opacity-100' : 'opacity-50 hover:opacity-70'
                  }`}
                >
                  <h3 className="text-[30px] font-bold leading-[0.9] tracking-tight text-white">
                    {industry.title}
                  </h3>
                  <p className="mt-2 max-w-[243px] text-sm font-semibold leading-tight tracking-tight text-white/30">
                    {industry.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
