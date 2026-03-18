import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function MarketingCTA() {
  return (
    <section className="bg-[#00FF00] py-20 md:py-28">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-headline text-3xl text-black md:text-5xl">
          Ready to Track Door to Door?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-black/70">
          Get your first tracking label and follow your cargo from pickup to
          delivery.
        </p>
        <Button
          size="lg"
          className="mt-8 h-14 rounded-full bg-black px-10 text-lg font-semibold text-white hover:bg-black/80"
          asChild
        >
          <Link href="/buy">Buy Your First Label</Link>
        </Button>
      </div>
    </section>
  )
}
