import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export function MarketingCTA() {
  return (
    <section className="border-t border-white/5 bg-black py-20 md:py-28">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-headline text-3xl text-white md:text-5xl">
          Ready to Track Door to Door?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-gray-400">
          Get your first tracking label and follow your cargo from pickup to
          delivery.
        </p>
        <SignedOut>
          <Button
            size="lg"
            className="mt-8 h-14 rounded-full bg-[#00FF2B] px-10 text-lg font-semibold text-black hover:bg-[#00DD25]"
            asChild
          >
            <Link href="/sign-up">Buy Your First Label</Link>
          </Button>
        </SignedOut>
        <SignedIn>
          <Button
            size="lg"
            className="mt-8 h-14 rounded-full bg-[#00FF2B] px-10 text-lg font-semibold text-black hover:bg-[#00DD25]"
            asChild
          >
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </SignedIn>
      </div>
    </section>
  )
}
