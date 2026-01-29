'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Preferences {
  notifyLabelActivated: boolean
  notifyLowBattery: boolean
  notifyNoSignal: boolean
  notifyDelivered: boolean
  notifyOrderShipped: boolean
}

const preferenceLabels = {
  notifyLabelActivated: {
    label: 'Label Activated',
    description: 'When a tracking label starts transmitting',
  },
  notifyLowBattery: {
    label: 'Low Battery',
    description: 'When battery drops below 20% and 10%',
  },
  notifyNoSignal: {
    label: 'No Signal',
    description: 'When a label stops transmitting for 24+ hours',
  },
  notifyDelivered: {
    label: 'Shipment Delivered',
    description: 'When a shipment arrives at destination',
  },
  notifyOrderShipped: {
    label: 'Order Shipped',
    description: 'When your label order ships',
  },
}

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<Preferences | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/v1/user/preferences')
      if (res.ok) {
        const data = await res.json()
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
      toast.error('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    if (!preferences) return

    setSaving(key)
    const previousValue = preferences[key]
    setPreferences({ ...preferences, [key]: value })

    try {
      const res = await fetch('/api/v1/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })

      if (!res.ok) {
        // Revert on error
        setPreferences({ ...preferences, [key]: previousValue })
        toast.error('Failed to update preference')
      }
    } catch (error) {
      console.error('Error updating preference:', error)
      setPreferences({ ...preferences, [key]: previousValue })
      toast.error('Failed to update preference')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Manage when you receive email alerts</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>Manage when you receive email alerts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(Object.keys(preferenceLabels) as (keyof Preferences)[]).map((key) => (
          <div key={key} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={key}>{preferenceLabels[key].label}</Label>
              <p className="text-sm text-muted-foreground">
                {preferenceLabels[key].description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving === key && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                id={key}
                checked={preferences[key]}
                onCheckedChange={(checked) => updatePreference(key, checked)}
                disabled={saving !== null}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
