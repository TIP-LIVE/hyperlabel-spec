import Link from 'next/link'

const footerLinks = [
  { href: '/how-it-works', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: 'mailto:support@tip.live', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

export function MarketingFooter() {
  return (
    <footer className="bg-black py-6">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        {/* Brand */}
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 34 34" fill="none" className="h-4 w-4" aria-hidden="true">
            <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
            <circle cx="22.12" cy="11.85" r="6.55" fill="black" />
          </svg>
          <span className="text-sm font-semibold text-white">tip.live</span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
