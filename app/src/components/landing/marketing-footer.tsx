import Link from 'next/link'

export function MarketingFooter() {
  return (
    <footer className="border-t bg-black py-8 text-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="font-medium">tip.live</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <Link href="/features" className="hover:text-white">
              Features
            </Link>
            <Link href="/compare" className="hover:text-white">
              Compare
            </Link>
            <Link href="/#pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="/#faq" className="hover:text-white">
              FAQ
            </Link>
            <Link href="/#contact" className="hover:text-white">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} TIP. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
