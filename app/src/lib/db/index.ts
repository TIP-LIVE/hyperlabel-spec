import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'

// Use fetch-based connections (HTTP) instead of WebSocket for maximum
// compatibility in serverless environments — no persistent TCP connections.
neonConfig.useSecureWebSocket = false
neonConfig.fetchFunction = globalThis.fetch

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

  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
