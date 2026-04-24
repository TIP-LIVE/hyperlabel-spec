'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, CreditCard, Check, ChevronDown, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LabelPackDisplay } from '@/lib/pricing'

const formSchema = z.object({
  packType: z.enum(['starter', 'team', 'volume']),
})

type FormData = z.infer<typeof formSchema>

function formatPrice(dollars: number): string {
  return Number.isInteger(dollars) ? dollars.toFixed(0) : dollars.toFixed(2)
}

const includedFeatures = [
  '60+ days battery life',
  'Global cellular coverage (180+ countries)',
  'Real-time location tracking',
  'Offline data storage',
  'Shareable tracking links',
  'Email notifications',
  'Free worldwide shipping',
]

interface BuyLabelsFormProps {
  packs: LabelPackDisplay[]
}

export function BuyLabelsForm({ packs }: BuyLabelsFormProps) {
  const [loading, setLoading] = useState(false)
  const [autoSubmitting, setAutoSubmitting] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const searchParams = useSearchParams()

  const packKeys = packs.map((p) => p.key)
  const packParam = searchParams.get('pack')
  const validPackParam = packParam && packKeys.includes(packParam)
    ? (packParam as 'starter' | 'team' | 'volume')
    : null

  const defaultPack = packs.find((p) => p.popular)?.key ?? packs[0]?.key ?? 'team'

  const {
    handleSubmit,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packType: validPackParam || (defaultPack as 'starter' | 'team' | 'volume'),
    },
  })

  const selectedPack = watch('packType')
  const currentPack = packs.find((p) => p.key === selectedPack) ?? packs[0]

  // Auto-submit when arriving with a valid ?pack= param
  useEffect(() => {
    if (validPackParam && !autoSubmitting) {
      setAutoSubmitting(true)
      handleSubmit(onSubmit)()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validPackParam])

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    try {
      const res = await fetch('/api/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const { url } = await res.json()
        if (url) {
          window.location.href = url
        } else {
          toast.error('Failed to create checkout session')
        }
      } else {
        let errorMessage = 'Failed to start checkout'
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = res.statusText || errorMessage
        }
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Pack Selection */}
      <div className="grid gap-3 md:grid-cols-3">
        {packs.map((pack) => (
          <button
            key={pack.key}
            type="button"
            aria-label={`Select ${pack.name} for $${pack.price}`}
            aria-pressed={selectedPack === pack.key}
            onClick={() => setValue('packType', pack.key as 'starter' | 'team' | 'volume')}
            className={cn(
              'relative rounded-xl border-2 p-5 text-left transition-all hover:border-primary/50',
              selectedPack === pack.key
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-muted'
            )}
          >
            {pack.popular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                Most Popular
              </Badge>
            )}
            {selectedPack === pack.key && (
              <div className="absolute right-3 top-3">
                <Check className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="text-lg font-semibold">{pack.name}</div>
            <div className="text-xs text-muted-foreground">{pack.description}</div>
            <div className="mt-3">
              <span className="text-3xl font-bold">${formatPrice(pack.price)}</span>
            </div>
            {pack.labels > 1 && (
              <div className="mt-1 text-sm text-muted-foreground">
                ${formatPrice(pack.perLabel)} per label
              </div>
            )}
            {pack.savings > 0 && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs text-green-700 dark:text-green-400">
                  Save ${formatPrice(pack.savings)}
                </Badge>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Pay Button */}
      <Button type="submit" size="lg" className="w-full text-base" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to payment...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${currentPack ? formatPrice(currentPack.price) : '0'}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          Secure checkout via Stripe
        </span>
        <span>Free worldwide shipping</span>
      </div>

      {/* Collapsible features */}
      <button
        type="button"
        onClick={() => setShowFeatures(!showFeatures)}
        className="flex w-full items-center justify-center gap-1 pt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        What&apos;s included with every label
        <ChevronDown className={cn('h-4 w-4 transition-transform', showFeatures && 'rotate-180')} />
      </button>

      {showFeatures && (
        <div className="grid gap-2 sm:grid-cols-2 rounded-lg border bg-muted/30 p-4">
          {includedFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>
      )}
    </form>
  )
}
