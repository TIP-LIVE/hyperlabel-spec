import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your TIP account',
}

type Props = { searchParams: Promise<{ redirect_url?: string }> }

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams
  const redirectUrl = params.redirect_url ?? ''
  console.log('[sign-in page] loaded', { redirect_url: redirectUrl, hasRedirect: !!redirectUrl })

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-2">
          Sign in to your account to continue tracking your shipments.
        </p>
      </div>

      <SignIn fallbackRedirectUrl={redirectUrl || undefined} />
    </div>
  )
}
