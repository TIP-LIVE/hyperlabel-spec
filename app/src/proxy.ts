import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/org-selection(.*)', // Org creation/selection page
  '/create-organization(.*)', // Org creation page
  '/track/(.*)', // Public tracking pages
  '/activate/(.*)', // Physical label QR scan
  '/privacy', // Privacy policy
  '/terms', // Terms of service
  '/docs/(.*)', // Documentation pages
  '/checkout/(.*)', // Checkout result pages
  '/api/webhooks/(.*)', // Webhooks
  '/api/v1/device/(.*)', // Device API
  '/api/v1/track/(.*)', // Public tracking API
  '/api/cron/(.*)', // Cron jobs (auth via CRON_SECRET)
  '/api/health(.*)', // Health checks
])

// Dashboard routes that require an active organization (settings is allowed without org to avoid redirect loops)
const isDashboardRouteRequiringOrg = createRouteMatcher([
  '/dashboard(.*)',
  '/shipments(.*)',
  '/orders(.*)',
  '/address-book(.*)',
  '/buy(.*)',
])


// API routes — let route handlers do their own auth (return 401 JSON, not redirect)
const isApiRoute = createRouteMatcher(['/api/(.*)'])

// Check if Clerk is configured
const hasClerkKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_test_REPLACE')

// Create the proxy handler (Next.js 16 renamed middleware → proxy)
const proxy = hasClerkKey
  ? clerkMiddleware(async (auth, req) => {
      if (isPublicRoute(req)) return

      // API routes: skip proxy-level auth — route handlers use requireOrgAuth()
      // which returns proper 401/403 JSON responses instead of redirects
      if (isApiRoute(req)) return

      // Page routes: require authentication; redirect to sign-in with return URL so user lands back here after sign-in
      const { userId } = await auth()
      if (!userId) {
        const pathname = req.nextUrl.pathname
        const signInUrl = new URL('/sign-in', req.url)
        // Clerk may expect full URL for redirect_url
        const redirectUrl = new URL(pathname, req.url).toString()
        signInUrl.searchParams.set('redirect_url', redirectUrl)
        console.log('[proxy] redirect to sign-in (no userId)', { pathname, redirect_url: redirectUrl, signInUrl: signInUrl.toString() })
        return NextResponse.redirect(signInUrl)
      }

      // For dashboard routes (except /settings), require an active organization
      if (isDashboardRouteRequiringOrg(req)) {
        const { orgId } = await auth()
        if (!orgId) {
          const orgSelectionUrl = new URL('/org-selection', req.url)
          return NextResponse.redirect(orgSelectionUrl)
        }
      }

      // Pass pathname so dashboard layout can redirect back to this URL after sign-in
      const pathname = req.nextUrl.pathname
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-pathname', pathname)
      console.log('[proxy] auth ok, passing x-pathname', { pathname })
      return NextResponse.next({ request: { headers: requestHeaders } })
    })
  : () => NextResponse.next()

export default proxy

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
