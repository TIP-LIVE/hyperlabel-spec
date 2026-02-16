import { cn } from '@/lib/utils'

type LogoSize = 'sm' | 'md' | 'lg'

interface LogoProps {
  /** Size variant: sm (20px), md (24px), lg (32px) */
  size?: LogoSize
  /** Show the "TIP" wordmark next to the icon */
  showText?: boolean
  /** Additional CSS classes for the wrapper */
  className?: string
  /** Override icon color class (defaults to current text color) */
  iconClassName?: string
  /** Override text color class (defaults to inheriting from parent) */
  textClassName?: string
}

const sizeConfig: Record<LogoSize, { icon: string; text: string; live: string }> = {
  sm: { icon: 'h-5 w-5', text: 'text-base font-bold', live: 'text-[8px]' },
  md: { icon: 'h-6 w-6', text: 'text-lg font-bold', live: 'text-[9px]' },
  lg: { icon: 'h-8 w-8', text: 'text-xl font-bold', live: 'text-[10px]' },
}

/**
 * TIP logo icon — filled circle matching the Figma brand.
 */
function TipLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" />
    </svg>
  )
}

/**
 * TIP product logo — single source of truth for all logo renderings.
 *
 * New brand: filled circle icon + "TIP" bold text + "Live" red subscript
 *
 * Usage:
 *   <Logo />                        — md icon + "TIP" text + "Live"
 *   <Logo size="lg" />              — lg icon + "TIP" text + "Live"
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
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <TipLogoIcon className={cn(config.icon, iconClassName)} />
      {showText && (
        <span className={cn('inline-flex items-baseline gap-0.5', textClassName)}>
          <span className={config.text}>TIP</span>
          <span className={cn(config.live, 'font-semibold text-red-500')}>Live</span>
        </span>
      )}
    </span>
  )
}
