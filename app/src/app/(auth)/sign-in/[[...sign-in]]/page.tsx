import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your TIP account',
}

export default function SignInPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-2">
          Sign in to your account to continue tracking your shipments.
        </p>
      </div>

      <SignIn />
    </div>
  )
}
