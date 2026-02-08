import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogoSize = 'sm' | 'md' | 'lg'

interface LogoProps {
  /** Size variant: sm (20px), md (24px), lg (32px) */
  size?: LogoSize
  /** Show the "TIP" wordmark next to the icon */
  showText?: boolean
  /** Additional CSS classes for the wrapper */
  className?: string
  /** Override icon color class (defaults to text-primary) */
  iconClassName?: string
  /** Override text color class (defaults to inheriting from parent) */
  textClassName?: string
}

const sizeConfig: Record<LogoSize, { icon: string; text: string }> = {
  sm: { icon: 'h-5 w-5', text: 'text-base font-bold' },
  md: { icon: 'h-6 w-6', text: 'text-lg font-bold' },
  lg: { icon: 'h-8 w-8', text: 'text-xl font-bold' },
}

/**
 * TIP product logo — single source of truth for all logo renderings.
 *
 * Usage:
 *   <Logo />                        — md icon + "TIP" text
 *   <Logo size="lg" />              — lg icon + "TIP" text
 *   <Logo showText={false} />       — icon only
 *   <Logo iconClassName="text-white" textClassName="text-white" />
 */
export function Logo({
  size = 'md',
  showText = true,
  className,
  iconClassName,
  textClassName,
}: LogoProps) {
  const config = sizeConfig[size]

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Package className={cn(config.icon, iconClassName ?? 'text-primary')} />
      {showText && <span className={cn(config.text, textClassName)}>TIP</span>}
    </span>
  )
}
