'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'

export function ThemeAwareClerkProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const { resolvedTheme } = useTheme()

  // Skip ClerkProvider if no valid key (allows build to complete in CI with dummy key)
  if (!publishableKey || publishableKey.startsWith('pk_test_REPLACE') || publishableKey === 'pk_test_dummy') {
    return <>{children}</>
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: {
          colorPrimary: isDark ? '#00dd00' : '#008800',
          colorDanger: '#dc2626',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
