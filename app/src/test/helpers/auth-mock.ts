import { vi } from 'vitest'
import { auth, currentUser } from '@clerk/nextjs/server'

const mockedAuth = vi.mocked(auth)
const mockedCurrentUser = vi.mocked(currentUser)

export function mockUnauthenticated() {
  mockedAuth.mockResolvedValue({
    userId: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
  } as never)
  mockedCurrentUser.mockResolvedValue(null)
}

export function mockAuthenticatedUser(overrides?: {
  userId?: string
  orgId?: string
  orgRole?: string
  orgSlug?: string
}) {
  const userId = overrides?.userId ?? 'clerk_test_user_001'
  const orgId = overrides?.orgId ?? 'org_test_001'
  const orgRole = overrides?.orgRole ?? 'org:member'
  const orgSlug = overrides?.orgSlug ?? 'test-org'

  mockedAuth.mockResolvedValue({
    userId,
    orgId,
    orgRole,
    orgSlug,
  } as never)
  mockedCurrentUser.mockResolvedValue({
    id: userId,
    emailAddresses: [{ emailAddress: 'test@tip.live', id: 'email_1' }],
    primaryEmailAddressId: 'email_1',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: null,
  } as never)
}

export function mockAdminUser(overrides?: {
  userId?: string
  orgId?: string
}) {
  const userId = overrides?.userId ?? 'clerk_admin_001'
  const orgId = overrides?.orgId ?? 'org_test_001'

  mockedAuth.mockResolvedValue({
    userId,
    orgId,
    orgRole: 'org:admin',
    orgSlug: 'test-org',
  } as never)
  mockedCurrentUser.mockResolvedValue({
    id: userId,
    emailAddresses: [{ emailAddress: 'admin@tip.live', id: 'email_1' }],
    primaryEmailAddressId: 'email_1',
    firstName: 'Admin',
    lastName: 'User',
    imageUrl: null,
  } as never)
}
