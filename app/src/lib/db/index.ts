import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // During build time or when DATABASE_URL is not set, create a minimal client
  // This allows the build to complete without a database connection
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set, Prisma client will not connect to a database')
    return new PrismaClient()
  }

  const connectionString = process.env.DATABASE_URL
  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Filter to exclude soft-deleted LocationEvents.
 * Spread into `where` clauses on all user-facing LocationEvent queries:
 *   `where: { ...VALID_LOCATION, shipmentId: ... }`
 * Also usable in relation includes:
 *   `locations: { where: { ...VALID_LOCATION, source: 'CELL_TOWER' } }`
 *
 * Internal/dedup queries that must see ALL events should NOT use this filter.
 */
export const VALID_LOCATION = { excludedReason: null } as const
