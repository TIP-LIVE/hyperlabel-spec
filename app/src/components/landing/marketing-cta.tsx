import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function MarketingCTA() {
  return (
    <section className="border-t bg-primary py-16 md:py-20 text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">Ready to Track Door to Door?</h2>
        <p className="mx-auto mt-3 max-w-lg opacity-90">
          Get your first tracking label and follow your cargo from pickup to delivery.
        </p>
        <Button size="lg" variant="secondary" className="mt-8 h-12 rounded-full px-8 text-base font-semibold" asChild>
          <Link href="/sign-up">Get Your First Label</Link>
        </Button>
      </div>
    </section>
  )
}
