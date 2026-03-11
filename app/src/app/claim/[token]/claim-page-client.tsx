'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Loader2,
  Package,
  MapPin,
  Battery,
  Clock,
  AlertTriangle,
  LogIn,
} from 'lucide-react'
import { AddressInput } from '@/components/ui/address-input'
import Link from 'next/link'

const claimFormSchema = z.object({
  name: z.string().min(1, 'Cargo name is required').max(200),
  originAddress: z.string().optional(),
  originLat: z.number().nullable().optional(),
  originLng: z.number().nullable().optional(),
  destinationAddress: z.string().optional(),
  destinationLat: z.number().nullable().optional(),
  destinationLng: z.number().nullable().optional(),
  consigneeEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  consigneePhone: z.string().max(30).optional().or(z.literal('')),
})

type ClaimFormData = z.infer<typeof claimFormSchema>

interface ClaimPageClientProps {
  token: string
  deviceId: string
  batteryPct: number | null
  locationCount: number
  firstReportAt: string | null
  claimExpiresAt: string | null
  expired: boolean
  existingShareCode: string | null
}

export function ClaimPageClient({
  token,
  deviceId,
  batteryPct,
  locationCount,
  firstReportAt,
  claimExpiresAt,
  expired: initialExpired,
  existingShareCode,
}: ClaimPageClientProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [expired, setExpired] = useState(initialExpired)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      name: '',
      originAddress: '',
      destinationAddress: '',
      consigneeEmail: '',
      consigneePhone: '',
    },
  })

  // Countdown timer
  useEffect(() => {
    if (!claimExpiresAt || expired) return

    const update = () => {
      const diff = new Date(claimExpiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        setTimeLeft('Expired')
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${hours}h ${minutes}m remaining`)
    }

    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [claimExpiresAt, expired])

  // If already claimed, redirect
  if (existingShareCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Package className="mx-auto h-12 w-12 text-green-600" />
            <CardTitle className="mt-4">Shipment Already Created</CardTitle>
            <CardDescription>
              A shipment has already been created for label {deviceId}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href={`/track/${existingShareCode}`}>View Tracking</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If expired, show login prompt
  if (expired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <CardTitle className="mt-4">Claim Window Expired</CardTitle>
            <CardDescription>
              The 24-hour claim window for label {deviceId} has expired.
              Please log in to your TIP dashboard to manage this shipment.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/sign-in">
                <LogIn className="mr-2 h-4 w-4" />
                Log In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onSubmit = async (data: ClaimFormData) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/claim/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setExpired(true)
          toast.error('Claim window has expired. Please log in.')
          return
        }
        toast.error(json.error || 'Failed to create shipment')
        return
      }

      toast.success('Shipment created successfully!')
      router.push(`/track/${json.shipment.shareCode}`)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-muted p-4 pt-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create Shipment</h1>
          <p className="mt-1 text-muted-foreground">
            Your label was activated — create a shipment to start tracking.
          </p>
        </div>

        {/* Device Info Card */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-sm font-semibold">{deviceId}</p>
              <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                {batteryPct !== null && (
                  <span className="flex items-center gap-1">
                    <Battery className="h-3 w-3" />
                    {batteryPct}%
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {locationCount} location{locationCount !== 1 ? 's' : ''}
                </span>
                {timeLeft && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeLeft}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
            <CardDescription>
              No login required — fill in the details below to link this label to your cargo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Cargo Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Cargo Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Electronics Pallet #42"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Origin */}
              <div className="space-y-2">
                <Label>Origin</Label>
                <AddressInput
                  onAddressSelect={(address, lat, lng) => {
                    setValue('originAddress', address)
                    setValue('originLat', lat ?? null)
                    setValue('originLng', lng ?? null)
                  }}
                  placeholder="Where is this shipping from?"
                />
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label>Destination</Label>
                <AddressInput
                  onAddressSelect={(address, lat, lng) => {
                    setValue('destinationAddress', address)
                    setValue('destinationLat', lat ?? null)
                    setValue('destinationLng', lng ?? null)
                  }}
                  placeholder="Where is this shipping to?"
                />
              </div>

              {/* Consignee Email */}
              <div className="space-y-2">
                <Label htmlFor="consigneeEmail">Consignee Email</Label>
                <Input
                  id="consigneeEmail"
                  type="email"
                  placeholder="recipient@example.com"
                  {...register('consigneeEmail')}
                />
                {errors.consigneeEmail && (
                  <p className="text-sm text-destructive">{errors.consigneeEmail.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The recipient will receive a tracking link via email.
                </p>
              </div>

              {/* Consignee Phone */}
              <div className="space-y-2">
                <Label htmlFor="consigneePhone">Consignee Phone</Label>
                <Input
                  id="consigneePhone"
                  type="tel"
                  placeholder="+44 7700 900000"
                  {...register('consigneePhone')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Shipment
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by <a href="https://tip.live" className="text-primary hover:underline">TIP</a> — door-to-door cargo tracking
        </p>
      </div>
    </div>
  )
}
