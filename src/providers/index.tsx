/**
 * Combined Providers
 */
'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from './auth-provider'
import { Toaster } from 'sonner'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" richColors />
    </AuthProvider>
  )
}
