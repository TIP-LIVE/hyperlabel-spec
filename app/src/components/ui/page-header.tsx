import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Page title */
  title: string
  /** Optional description below the title */
  description?: string
  /** Optional action element (e.g. a Button) rendered to the right */
  action?: React.ReactNode
  /** Additional CSS classes for the wrapper */
  className?: string
}

/**
 * Consistent page title + description header.
 *
 * Usage:
 *   <PageHeader title="Dashboard" description="Overview of shipments" />
 *   <PageHeader title="Shipments" description="..." action={<Button>New</Button>} />
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}
