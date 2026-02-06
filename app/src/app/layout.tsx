import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/sonner'
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
    'Door-to-door cargo tracking labels. Stick a label on your shipment and track it from pickup to delivery — in 180+ countries.',
  keywords: ['cargo tracking', 'door-to-door tracking', 'shipment tracking', 'tracking labels', 'logistics'],
  authors: [{ name: 'TIP' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://tip.live'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://tip.live',
    siteName: 'TIP',
    title: 'TIP — Door-to-Door Cargo Tracking',
    description: 'Door-to-door cargo tracking labels. Stick a label on your shipment and track it from pickup to delivery.',
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
    description: 'Door-to-door cargo tracking labels. Stick a label on your shipment and track it from pickup to delivery.',
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
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

function ConditionalClerkProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // Skip ClerkProvider if no valid key (allows build to complete)
  if (!publishableKey || publishableKey.startsWith('pk_test_REPLACE')) {
    return <>{children}</>
  }

  return <ClerkProvider>{children}</ClerkProvider>
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ConditionalClerkProvider>{children}</ConditionalClerkProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
