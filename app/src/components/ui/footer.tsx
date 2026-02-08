import { cn } from '@/lib/utils'

interface FooterProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Simple copyright footer used across public pages.
 *
 * Usage:
 *   <Footer />
 */
export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('border-t py-8', className)}>
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} TIP. All rights reserved.
      </div>
    </footer>
  )
}
