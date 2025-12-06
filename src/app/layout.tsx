/**
 * Root Layout for Medical Distribution Management System
 */
import type { Metadata } from 'next'
import { Providers } from '@/providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Medical Distribution Management System',
    template: '%s | Medical Distribution',
  },
  description: 'Medical Distribution Management System for Beshara Group - Healthcare Solutions Division',
  keywords: ['medical', 'distribution', 'healthcare', 'budget', 'tender', 'inventory'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
