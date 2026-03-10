import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface FeatureSectionProps {
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  specs: { label: string; value: string }[]
  reversed?: boolean
  muted?: boolean
}

export function FeatureSection({
  icon: Icon,
  title,
  subtitle,
  description,
  specs,
  reversed = false,
  muted = false,
}: FeatureSectionProps) {
  return (
    <section className={cn('py-20 md:py-24', muted && 'bg-muted')}>
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content */}
          <div className={cn(reversed && 'lg:order-last')}>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-3xl font-bold md:text-4xl">{title}</h2>
            <p className="mt-3 text-lg font-medium text-primary">{subtitle}</p>
            <p className="mt-4 max-w-lg text-muted-foreground leading-relaxed">{description}</p>

            {/* Specs grid */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.map((spec) => (
                <div key={spec.label} className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-sm font-bold">{spec.value}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{spec.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual placeholder */}
          <div className={cn(reversed && 'lg:order-first')}>
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/10">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon className="h-10 w-10 text-primary" />
                </div>
                <p className="max-w-[200px] text-sm font-medium text-muted-foreground">{title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
