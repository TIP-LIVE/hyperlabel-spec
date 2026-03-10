import { MarketingHeader } from '@/components/landing/marketing-header'
import { MarketingCTA } from '@/components/landing/marketing-cta'
import { MarketingFooter } from '@/components/landing/marketing-footer'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingCTA />
      <MarketingFooter />
    </div>
  )
}
