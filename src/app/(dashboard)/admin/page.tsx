'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, FileText, Brain, Users, Shield, Database } from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin role required.</p>
      </div>
    )
  }

  const adminModules = [
    {
      title: 'System Settings',
      description: 'Configure general system settings, approval thresholds, and notifications',
      href: '/admin/settings',
      icon: Settings,
      color: 'text-blue-500',
    },
    {
      title: 'Extraction Templates',
      description: 'Manage AI extraction templates for documents, tenders, and invoices',
      href: '/admin/templates',
      icon: FileText,
      color: 'text-green-500',
    },
    {
      title: 'AI Configuration',
      description: 'Configure AI providers, API keys, and model preferences',
      href: '/admin/ai-config',
      icon: Brain,
      color: 'text-purple-500',
    },
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      href: '/users',
      icon: Users,
      color: 'text-orange-500',
    },
    {
      title: 'Audit Logs',
      description: 'View system audit trail and activity logs',
      href: '/admin/audit',
      icon: Shield,
      color: 'text-red-500',
    },
    {
      title: 'Database Tools',
      description: 'Database management and maintenance tools',
      href: '/admin/database',
      icon: Database,
      color: 'text-cyan-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">
          System configuration and administration tools
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <module.icon className={`h-8 w-8 ${module.color}`} />
                  <div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{module.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
