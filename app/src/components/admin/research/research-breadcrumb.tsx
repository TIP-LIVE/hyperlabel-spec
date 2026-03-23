'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface ResearchBreadcrumbProps {
  items: BreadcrumbItem[]
}

export function ResearchBreadcrumb({ items }: ResearchBreadcrumbProps) {
  const allItems: BreadcrumbItem[] = [
    { label: 'Research', href: '/admin/research' },
    ...items,
  ]

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {allItems.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.href && i < allItems.length - 1 ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className={i === allItems.length - 1 ? 'text-foreground font-medium' : ''}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
