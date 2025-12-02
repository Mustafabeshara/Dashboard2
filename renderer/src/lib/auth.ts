/**
 * Authentication configuration and utilities
 */
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import type { UserRole } from '@/types'

/**
 * Extended session user type
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      fullName: string
      role: UserRole
      department?: string
    }
  }

  interface User {
    id: string
    email: string
    fullName: string
    role: UserRole
    department?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    fullName: string
    role: UserRole
    department?: string
  }
}

/**
 * NextAuth configuration
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        try {
          // In server-side API routes, we can't use window.electronAPI
          // Check if LOCAL_DATABASE_URL is set (indicates Electron mode)
          // In Electron, we should use the cloud database via Prisma, not IPC
          // IPC is only for client-side operations
          
          // Always use Prisma for server-side authentication
          // The DATABASE_URL should point to the Railway database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            throw new Error('Invalid email or password')
          }

          if (!user.isActive) {
            throw new Error('Account is inactive. Please contact administrator.')
          }

          if (user.isDeleted) {
            throw new Error('Account not found')
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!isValidPassword) {
            throw new Error('Invalid email or password')
          }

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role as UserRole,
            department: user.department || undefined,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          throw error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.fullName = user.fullName
        token.role = user.role
        token.department = user.department
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.fullName = token.fullName as string
        session.user.role = token.role as UserRole
        session.user.department = token.department as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
  },
  jwt: {
    maxAge: 30 * 60, // 30 minutes
  },
  secret: 'development-secret-key-for-nextauth-electron-app-minimum-32-characters-required-for-jwt-encryption-and-session-security-purposes-fixed-stable-secret-1234567890',
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Verify a password
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Role-based permission checking
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'],
  CEO: [
    'budgets:*',
    'tenders:*',
    'reports:*',
    'users:view',
    'expenses:*',
    'invoices:*',
  ],
  CFO: [
    'budgets:*',
    'expenses:*',
    'reports:*',
    'invoices:*',
    'tenders:view',
  ],
  FINANCE_MANAGER: [
    'budgets:view',
    'budgets:approve',
    'expenses:*',
    'invoices:*',
    'reports:view',
  ],
  MANAGER: [
    'budgets:view',
    'budgets:create',
    'expenses:create',
    'expenses:approve',
    'tenders:view',
    'reports:view',
  ],
  SALES: [
    'tenders:*',
    'customers:*',
    'invoices:view',
    'budgets:view',
  ],
  WAREHOUSE: [
    'inventory:*',
    'products:view',
    'tenders:view',
  ],
  FINANCE: [
    'invoices:*',
    'expenses:*',
    'reports:view',
    'budgets:view',
  ],
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false

  // Admin has all permissions
  if (permissions.includes('*')) return true

  // Check exact match
  if (permissions.includes(permission)) return true

  // Check wildcard permissions (e.g., 'budgets:*' matches 'budgets:create')
  const [resource, action] = permission.split(':')
  const wildcardPermission = `${resource}:*`
  if (permissions.includes(wildcardPermission)) return true

  return false
}

/**
 * Get approval level required for an amount
 */
export function getRequiredApprovalLevel(amount: number): {
  level: number
  role: UserRole
} {
  if (amount < 1000) {
    return { level: 0, role: 'MANAGER' } // Auto-approve
  } else if (amount < 10000) {
    return { level: 1, role: 'MANAGER' }
  } else if (amount < 50000) {
    return { level: 2, role: 'FINANCE_MANAGER' }
  } else if (amount < 100000) {
    return { level: 3, role: 'CFO' }
  } else {
    return { level: 4, role: 'CEO' }
  }
}

/**
 * Check if a role can approve a certain level
 */
export function canApprove(role: UserRole, requiredLevel: number): boolean {
  const roleApprovalLevels: Record<UserRole, number> = {
    ADMIN: 5,
    CEO: 4,
    CFO: 3,
    FINANCE_MANAGER: 2,
    MANAGER: 1,
    SALES: 0,
    WAREHOUSE: 0,
    FINANCE: 0,
  }

  return roleApprovalLevels[role] >= requiredLevel
}
