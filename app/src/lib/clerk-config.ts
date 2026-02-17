/**
 * Check if Clerk is properly configured with valid API keys.
 */
export function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  return Boolean(key && !key.startsWith('pk_test_REPLACE') && key !== 'pk_test_dummy')
}
