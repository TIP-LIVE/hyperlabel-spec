import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Radio,
  Package,
  ShoppingCart,
  BatteryWarning,
  WifiOff,
  Activity,
  MapPin,
  Archive,
} from 'lucide-react'
import type { FleetStats } from '@/lib/fleet-stats'

interface FleetStatsGridProps {
  stats: FleetStats
}

export function FleetStatsGrid({ stats }: FleetStatsGridProps) {
  const cards = [
    {
      title: 'Active',
      value: stats.counts.active,
      icon: Radio,
      color: 'text-green-600 dark:text-green-400',
      href: '/admin/devices?health=ALL',
    },
    {
      title: 'Inventory',
      value: stats.counts.inventory,
      icon: Package,
      color: 'text-muted-foreground',
      href: '/admin/labels',
    },
    {
      title: 'Sold',
      value: stats.counts.sold,
      icon: ShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      href: '/admin/labels',
    },
    {
      title: 'Depleted',
      value: stats.counts.depleted,
      icon: Archive,
      color: 'text-muted-foreground',
      href: '/admin/labels',
    },
    {
      title: 'Low Battery',
      value: stats.counts.lowBattery,
      icon: BatteryWarning,
      color: stats.counts.lowBattery > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground',
      alert: stats.counts.lowBattery > 0,
      href: '/admin/devices?health=LOW_BATTERY',
    },
    {
      title: 'No Signal',
      value: stats.counts.noSignal,
      icon: WifiOff,
      color: stats.counts.noSignal > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
      alert: stats.counts.noSignal > 0,
      href: '/admin/devices?health=NO_SIGNAL',
    },
    {
      title: 'Reports / 24h',
      value: stats.reporting.last24h,
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      href: undefined,
    },
    {
      title: 'Total Events',
      value: stats.reporting.total.toLocaleString(),
      icon: MapPin,
      color: 'text-muted-foreground',
      href: undefined,
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const content = (
          <Card
            className={`border-border bg-card transition-colors ${card.href ? 'hover:border-border/80 hover:bg-accent' : ''}`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon
                className={`h-4 w-4 ${card.alert ? card.color : 'text-muted-foreground'}`}
              />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        )

        if (card.href) {
          return (
            <Link key={card.title} href={card.href}>
              {content}
            </Link>
          )
        }
        return <div key={card.title}>{content}</div>
      })}
    </div>
  )
}
