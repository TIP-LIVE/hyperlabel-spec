import { SignUp } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your TIP account to start tracking cargo',
}

export default function SignUpPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground mt-2">
          Start tracking your cargo in minutes. No credit card required.
        </p>
      </div>

      <SignUp />
    </div>
  )
}
