import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeAwareClerkProvider } from '@/components/clerk-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'TIP — Door-to-Door Cargo Tracking',
    template: '%s | TIP',
  },
  description:
    'Door-to-door cargo tracking labels. Reliable updates every 2 hours in 180+ countries. AI-powered route detection, delivery alerts. From $20 per label.',
  keywords: ['cargo tracking', 'door-to-door tracking', 'shipment tracking', 'tracking labels', 'logistics', 'AI cargo tracking', 'smart tracking label'],
  authors: [{ name: 'TIP' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://tip.live',
    siteName: 'TIP',
    title: 'TIP — Door-to-Door Cargo Tracking',
    description: 'Reliable cargo tracking every 2 hours in 180+ countries. AI-powered route detection, delivery alerts, shareable links.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TIP — Door-to-Door Cargo Tracking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TIP — Door-to-Door Cargo Tracking',
    description: 'Reliable cargo tracking every 2 hours in 180+ countries. AI-powered route detection, delivery alerts, shareable links.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={300}>
            <ThemeAwareClerkProvider>{children}</ThemeAwareClerkProvider>
          </TooltipProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
