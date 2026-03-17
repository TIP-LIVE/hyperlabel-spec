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
 * TIP logo icon — eye mark matching the brand.
 * Static version of the animated eye used on the landing page (frame 0: pupil looking up-right).
 */
function TipLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 34 34"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16.77" cy="16.77" r="16.77" className="fill-black dark:fill-white" />
      <circle cx="22.12" cy="11.85" r="6.55" className="fill-white dark:fill-black" />
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
