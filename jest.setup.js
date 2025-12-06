/**
 * Jest Setup
 * Runs before each test file
 */

import '@testing-library/jest-dom'

// Mock Web APIs for Node.js environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      // Use defineProperty to allow NextRequest to override
      Object.defineProperty(this, 'url', {
        value: typeof input === 'string' ? input : input?.url || '',
        writable: true,
        configurable: true,
      })
      Object.defineProperty(this, 'method', {
        value: init?.method || 'GET',
        writable: true,
        configurable: true,
      })
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
  }
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
    json() {
      return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
    }
    text() {
      return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body))
    }
    static json(data, init) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'content-type': 'application/json', ...init?.headers },
      })
    }
  }
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = new Map(Object.entries(init || {}))
    }
    get(name) {
      return this._headers.get(name.toLowerCase()) || null
    }
    set(name, value) {
      this._headers.set(name.toLowerCase(), value)
    }
  }
}

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret-minimum-32-characters-long'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock NextAuth React
jest.mock('next-auth/react', () => ({
  useSession() {
    return {
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      },
      status: 'authenticated',
    }
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock NextAuth server-side
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    auth: jest.fn(),
    handlers: { GET: jest.fn(), POST: jest.fn() },
  })),
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'ADMIN',
    },
  })),
}))

// Mock NextAuth next module
jest.mock('next-auth/next', () => ({
  __esModule: true,
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'ADMIN',
    },
  })),
}))

// Mock NextAuth providers
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: 'credentials',
    name: 'Credentials',
    type: 'credentials',
    credentials: {},
    authorize: jest.fn(),
  })),
}))

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  },
}))

// Mock Prisma Client module for error types
jest.mock('@prisma/client', () => {
  const actualPrisma = jest.requireActual('@prisma/client')
  return {
    ...actualPrisma,
    Prisma: {
      ...actualPrisma.Prisma,
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        constructor(message, { code, meta } = {}) {
          super(message)
          this.code = code
          this.meta = meta
          this.name = 'PrismaClientKnownRequestError'
        }
      },
      PrismaClientValidationError: class PrismaClientValidationError extends Error {
        constructor(message) {
          super(message)
          this.name = 'PrismaClientValidationError'
        }
      },
    },
  }
})

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
