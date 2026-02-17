import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // During build time or when DATABASE_URL is not set, create a minimal client
  // This allows the build to complete without a database connection
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set, Prisma client will not connect to a database')
    // Return a PrismaClient that will fail on actual queries but allows build
    return new PrismaClient()
  }

  // Silence pg SSL warning: prefer/require/verify-ca are treated as verify-full in pg v9; set explicitly.
  // For local dev without SSL use DATABASE_URL with ?sslmode=disable.
  let connectionString = process.env.DATABASE_URL
  const isLocalHost = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(connectionString)
  if (!isLocalHost) {
    if (!connectionString.includes('sslmode=')) {
      const sep = connectionString.includes('?') ? '&' : '?'
      connectionString = `${connectionString}${sep}sslmode=verify-full`
    } else {
      connectionString = connectionString.replace(
        /sslmode=(?:prefer|require|verify-ca)/gi,
        'sslmode=verify-full'
      )
    }
  }

  const pool = new Pool({
    connectionString,
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
