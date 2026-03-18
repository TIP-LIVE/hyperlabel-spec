import Link from 'next/link'
import { Mail } from 'lucide-react'

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-black py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 34 34" fill="none" className="h-7 w-7" aria-hidden="true">
                <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
                <circle cx="22.12" cy="11.85" r="6.55" fill="black" />
              </svg>
              <span className="text-xl font-bold text-[#00FF2B]">TIP</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-gray-500">
              Door-to-door cargo tracking labels. Real-time visibility in 180+
              countries.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Product
              </h4>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-gray-400">
                <Link href="/how-it-works" className="hover:text-white">How It Works</Link>
                <Link href="/technology" className="hover:text-white">Technology</Link>
                <Link href="/#faq" className="hover:text-white">FAQ</Link>
              </nav>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Company
              </h4>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-gray-400">
                <Link href="/privacy" className="hover:text-white">Privacy</Link>
                <Link href="/terms" className="hover:text-white">Terms</Link>
                <a
                  href="mailto:support@tip.live"
                  className="inline-flex items-center gap-1.5 hover:text-white"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Contact
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} TIP. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
