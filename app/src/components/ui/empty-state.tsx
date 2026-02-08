import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  /** Lucide icon to display */
  icon: LucideIcon
  /** Heading text */
  title: string
  /** Description text */
  description: string
  /** Action buttons rendered below the description */
  action?: React.ReactNode
  /** Additional CSS classes for the card */
  className?: string
  /** Override icon class (defaults to text-muted-foreground/50) */
  iconClassName?: string
}

/**
 * Empty state card with icon, title, description, and optional action.
 *
 * Usage:
 *   <EmptyState
 *     icon={Package}
 *     title="No shipments yet"
 *     description="Create a shipment to get started."
 *     action={<Button asChild><Link href="/buy">Buy Labels</Link></Button>}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Icon className={cn('mb-4 h-16 w-16', iconClassName ?? 'text-muted-foreground/50')} />
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-6 flex gap-3">{action}</div>}
      </CardContent>
    </Card>
  )
}
