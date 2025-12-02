/**
 * Enhanced Prisma Client with Connection Pooling and Query Monitoring
 */
import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPromise: Promise<PrismaClient> | undefined
}

let prismaInstance: PrismaClient | undefined

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Create Prisma Client with retry logic and monitoring
 */
async function createPrismaClient(): Promise<PrismaClient> {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  })

  // Query monitoring - log slow queries
  client.$on('query' as any, (e: any) => {
    if (e.duration > 1000) { // Queries over 1 second
      logger.warn('Slow query detected', {
        context: {
          query: e.query,
          duration: e.duration,
          params: e.params,
        },
      })
    } else if (process.env.NODE_ENV === 'development' && e.duration > 100) {
      logger.debug('Query executed', {
        context: {
          query: e.query,
          duration: e.duration,
        },
      })
    }
  })

  // Error logging
  client.$on('error' as any, (e: any) => {
    logger.error('Prisma error', new Error(e.message), {
      target: e.target,
    })
  })

  // Skip connection during build phase
  if (process.env.SKIP_DB_CONNECTION === 'true') {
    logger.info('Skipping database connection during build')
    return client
  }

  // Retry logic for connection
  const maxRetries = 5
  const baseDelay = 1000 // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test the connection
      await client.$connect()
      logger.info('Database connection established successfully', {
        context: { attempt, maxRetries },
      })
      return client
    } catch (error) {
      logger.error(`Database connection attempt ${attempt}/${maxRetries} failed`, error as Error)
      
      if (attempt === maxRetries) {
        logger.error('Max retries reached. Database connection failed.')
        // Return client anyway to allow app to start (will fail on first query)
        return client
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = baseDelay * Math.pow(2, attempt - 1)
      logger.info(`Retrying in ${delay}ms...`)
      await sleep(delay)
    }
  }

  return client
}

/**
 * Get or create Prisma Client instance (lazy initialization)
 */
export async function getPrisma(): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance
  }

  if (globalForPrisma.prismaPromise) {
    return globalForPrisma.prismaPromise
  }

  globalForPrisma.prismaPromise = createPrismaClient()
  prismaInstance = await globalForPrisma.prismaPromise

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance
  }

  return prismaInstance
}

/**
 * Synchronous export for backward compatibility
 * Note: This will create the client but won't wait for connection
 * In Electron mode, this client may not be used (IPC is used instead)
 */
function getPrismaClientSync(): PrismaClient {
  // Use the shared prismaInstance variable (declared at top of file)
  if (prismaInstance) {
    return prismaInstance
  }

  // Check if DATABASE_URL is available - required for Prisma
  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL environment variable is not set. Database operations will fail.')
  }

  try {
    const client = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    })

    // Add query monitoring
    client.$on('query' as any, (e: any) => {
      if (e.duration > 1000) {
        logger.warn('Slow query detected', {
          context: {
            query: e.query,
            duration: e.duration,
          },
        })
      }
    })

    client.$on('error' as any, (e: any) => {
      logger.error('Prisma error', new Error(e.message))
    })

    prismaInstance = client
    return client
  } catch (error) {
    logger.warn('Failed to initialize Prisma Client', { error })
    // Create a mock client for build phase - will fail at runtime if used
    const mockClient = new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === '$connect' || prop === '$disconnect') {
          return async () => {}
        }
        throw new Error('Prisma Client failed to initialize. Check DATABASE_URL.')
      }
    })
    prismaInstance = mockClient
    return mockClient
  }
}

export const prisma = getPrismaClientSync()

export default prisma

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await getPrisma()
    await client.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    logger.error('Database connection test failed', error as Error)
    return false
  }
}

/**
 * Graceful shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect()
    logger.info('Database connection closed')
  }
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectPrisma()
  })
}
