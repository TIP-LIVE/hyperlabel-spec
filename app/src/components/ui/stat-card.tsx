import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  /** Stat label */
  title: string
  /** Stat value (number or formatted string) */
  value: string | number
  /** Lucide icon */
  icon: LucideIcon
  /** Description text below the value */
  description?: string
  /** Highlight as alert (destructive styling) */
  alert?: boolean
  /** Additional CSS classes for the card */
  className?: string
}

/**
 * Dashboard stat card with icon, value, and description.
 *
 * Usage:
 *   <StatCard title="Active Shipments" value={12} icon={Truck} description="Currently in transit" />
 *   <StatCard title="Low Battery" value={3} icon={Battery} alert description="Needs attention" />
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  alert,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('transition-colors hover:border-primary/50 hover:bg-accent/50', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', alert ? 'text-destructive' : 'text-muted-foreground')} />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', alert && 'text-destructive')}>
          {value}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}
