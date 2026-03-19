import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AnimatedEyeLogo } from '@/components/landing/animated-eye-logo'

export function MarketingCTA() {
  return (
    <section className="bg-[#00FF2B] py-16 md:py-20">
      <div className="container mx-auto px-4 text-center">
        {/* Animated eye logo */}
        <div className="mx-auto mb-8 w-[75px]">
          <AnimatedEyeLogo />
        </div>

        <h2 className="text-headline mx-auto max-w-[823px] text-4xl text-black md:text-[55px]">
          Ready to Track Door to Door?
        </h2>
        <p className="text-headline mx-auto mt-2 max-w-[823px] text-4xl text-black/50 md:text-[55px]">
          Get your first tracking label and follow your cargo from pickup to delivery.
        </p>

        <Button
          size="lg"
          className="mt-10 h-[68px] rounded-full bg-black px-10 text-[17px] font-semibold text-[#00FF2B] hover:bg-black/80"
          asChild
        >
          <Link href="/buy">Get Your First Label</Link>
        </Button>
      </div>
    </section>
  )
}
