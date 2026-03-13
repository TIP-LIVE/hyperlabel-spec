import type React from 'react'

interface SectionCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  badge?: string
  children: React.ReactNode
}

export function SectionCard({
  icon: Icon,
  title,
  badge,
  children,
}: SectionCardProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
        {badge && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  )
}
