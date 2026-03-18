import Image from 'next/image'
import { cn } from '@/lib/utils'

type LogoSize = 'sm' | 'md' | 'lg'

interface LogoProps {
  /** Size variant: sm (20px height), md (24px height), lg (32px height) */
  size?: LogoSize
  /** Additional CSS classes for the wrapper */
  className?: string
}

const sizeConfig: Record<LogoSize, { class: string; height: number; width: number }> = {
  sm: { class: 'h-5', height: 20, width: 70 },
  md: { class: 'h-6', height: 24, width: 84 },
  lg: { class: 'h-8', height: 32, width: 112 },
}

function DarkModeSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 119 34"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16.7717" cy="16.7717" r="16.7717" fill="white" />
      <circle cx="6.54899" cy="6.54899" r="6.54899" transform="matrix(-1 0 0 1 30.6685 12.2993)" fill="black" />
      <path d="M82.9991 31.3842V0.91284H102.23C112.323 0.91284 118.995 3.71773 118.995 11.3887C118.995 19.4209 112.557 22.4595 102.378 22.4595H97.5973V31.3842H82.9991ZM97.5973 15.426H99.5735C102.782 15.426 104.567 14.2573 104.567 11.5374C104.567 8.86003 102.782 7.86132 99.616 7.86132H97.5973V15.426Z" fill="#00FF2B" />
      <path d="M66.5291 31.3842V0.91284H81.1272V31.3842H66.5291Z" fill="#00FF2B" />
      <path d="M45.3926 31.3843V9.60389H37.582L34.6617 0.912975H64.881V9.60389H59.9908V31.3843H45.3926Z" fill="#00FF2B" />
      <circle cx="2.15637" cy="2.15637" r="2.15637" transform="matrix(-1 0 0 1 106.062 27.1543)" fill="#FF0000" />
      <path d="M108.548 27.028V30.0815H110.441V31.09H107.377V27.028H108.548ZM110.543 28.0757H111.663V31.09H110.543V28.0757ZM110.543 27.028H111.663V27.8236H110.543V27.028ZM112.915 28.0757L113.397 29.975L113.85 28.0757H115.016L114.002 31.09H112.758L111.716 28.0757H112.915ZM116.496 31.1684C115.431 31.1684 114.821 30.4905 114.821 29.5436C114.821 28.58 115.532 27.9637 116.445 27.9637C117.499 27.9637 118.154 28.7929 118.081 29.8406H115.907C115.947 30.1487 116.16 30.3448 116.513 30.3448C116.731 30.3448 116.955 30.2384 117.022 30.0759H118.076C117.941 30.5185 117.437 31.1684 116.496 31.1684ZM116.518 28.7312C116.283 28.7312 115.997 28.8601 115.924 29.2187H117.09C117.062 28.8601 116.759 28.7312 116.518 28.7312Z" fill="#FF0000" />
    </svg>
  )
}

/**
 * TIP product logo — switches between dark mode (green SVG) and light mode (black PNG).
 */
export function Logo({
  size = 'md',
  className,
}: LogoProps) {
  const config = sizeConfig[size]

  return (
    <span className={cn(config.class, 'w-auto inline-flex items-center', className)} aria-label="TIP Live" role="img">
      {/* Dark mode: green SVG logo */}
      <DarkModeSvg className="hidden dark:block h-full w-auto" />
      {/* Light mode: black PNG logo */}
      <Image
        src="/logo-light.png"
        alt="TIP Live"
        width={config.width}
        height={config.height}
        className="block dark:hidden h-full w-auto"
        priority
      />
    </span>
  )
}
