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

      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border rounded-lg p-0',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            socialButtonsBlockButtonText: 'font-medium',
            dividerLine: 'bg-border',
            dividerText: 'text-muted-foreground',
            formFieldLabel: 'text-sm font-medium',
            formFieldInput:
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            formButtonPrimary:
              'bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
            footerActionLink: 'text-primary hover:text-primary/80',
            identityPreviewEditButton: 'text-primary hover:text-primary/80',
          },
        }}
      />
    </div>
  )
}
