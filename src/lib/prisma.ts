/**
 * Prisma Client Singleton with Lazy Initialization and Retry Logic
 * Ensures only one instance of Prisma Client exists and handles connection failures gracefully
 */
import { PrismaClient } from '@prisma/client'

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
 * Create Prisma Client with retry logic
 */
async function createPrismaClient(): Promise<PrismaClient> {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // Skip connection during build phase
  if (process.env.SKIP_DB_CONNECTION === 'true') {
    console.log('Skipping database connection during build')
    return client
  }

  // Retry logic for connection
  const maxRetries = 5
  const baseDelay = 1000 // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test the connection
      await client.$connect()
      console.log('Database connection established successfully')
      return client
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${maxRetries} failed:`, error)
      
      if (attempt === maxRetries) {
        console.error('Max retries reached. Database connection failed.')
        // Return client anyway to allow app to start (will fail on first query)
        return client
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`Retrying in ${delay}ms...`)
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
    console.warn('DATABASE_URL environment variable is not set. Database operations will fail.')
  }

  try {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.warn('Failed to initialize Prisma Client:', error)
    // Return a no-op client that will throw on use
    // In Electron mode, this shouldn't be used anyway
    prismaInstance = {
      $connect: async () => {},
      $disconnect: async () => {},
    } as any
  }

  return prismaInstance
}

export const prisma = getPrismaClientSync()

export default prisma
