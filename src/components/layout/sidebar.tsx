/**
 * Sidebar Navigation Component
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Package,
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Stethoscope,
  ClipboardList,
  Receipt,
  ShoppingCart,
  Bell,
  CheckCircle,
  FolderOpen,
  Sparkles,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'
import type { UserRole } from '@/types'

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  badge?: number
  roles?: UserRole[]
  children?: {
    title: string
    href: string
    roles?: UserRole[]
  }[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Budgets',
    href: '/budgets',
    icon: <Wallet className="h-5 w-5" />,
    children: [
      { title: 'All Budgets', href: '/budgets' },
      { title: 'Create Budget', href: '/budgets/create' },
      { title: 'Approvals', href: '/budgets/approvals', roles: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'] },
      { title: 'Reports', href: '/budgets/reports' },
    ],
  },
  {
    title: 'Tenders',
    href: '/tenders',
    icon: <FileText className="h-5 w-5" />,
    children: [
      { title: 'All Tenders', href: '/tenders' },
      { title: 'Create Tender', href: '/tenders/create', roles: ['ADMIN', 'SALES', 'MANAGER'] },
      { title: 'Pipeline', href: '/tenders/pipeline' },
    ],
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: <Package className="h-5 w-5" />,
    children: [
      { title: 'Stock Levels', href: '/inventory' },
      { title: 'Products', href: '/inventory/products' },
      { title: 'Low Stock Alerts', href: '/inventory/alerts' },
    ],
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: <Building2 className="h-5 w-5" />,
    roles: ['ADMIN', 'SALES', 'MANAGER', 'CEO'],
  },
  {
    title: 'Expenses',
    href: '/expenses',
    icon: <Receipt className="h-5 w-5" />,
    roles: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'FINANCE', 'MANAGER'],
    children: [
      { title: 'All Expenses', href: '/expenses' },
      { title: 'Submit Expense', href: '/expenses/create' },
      { title: 'Pending Approval', href: '/expenses/pending' },
    ],
  },
  {
    title: 'Invoices',
    href: '/invoices',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'FINANCE', 'SALES'],
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: <FolderOpen className="h-5 w-5" />,
    children: [
      { title: 'Document Hub', href: '/documents' },
      { title: 'AI Processing', href: '/documents/ai', roles: ['ADMIN', 'CEO', 'CFO', 'MANAGER'] },
    ],
  },
  {
    title: 'Suppliers',
    href: '/suppliers',
    icon: <ShoppingCart className="h-5 w-5" />,
    roles: ['ADMIN', 'WAREHOUSE', 'MANAGER'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'],
  },
  {
    title: 'Users',
    href: '/users',
    icon: <Users className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
  },
]

interface SidebarProps {
  pendingApprovals?: number
  alerts?: number
}

export function Sidebar({ pendingApprovals = 0, alerts = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const userRole = session?.user?.role as UserRole | undefined

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  const isItemVisible = (item: NavItem) => {
    if (!item.roles) return true
    if (!userRole) return false
    return item.roles.includes(userRole)
  }

  const isChildVisible = (child: NonNullable<NavItem['children']>[0]) => {
    if (!child.roles) return true
    if (!userRole) return false
    return child.roles.includes(userRole)
  }

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-semibold">Medical Dist.</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
          />
        </Button>
      </div>

      {/* Quick Stats */}
      {!collapsed && (pendingApprovals > 0 || alerts > 0) && (
        <div className="p-4 border-b border-slate-800 space-y-2">
          {pendingApprovals > 0 && (
            <Link
              href="/budgets/approvals"
              className="flex items-center justify-between p-2 rounded bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
            >
              <span className="flex items-center text-sm text-amber-400">
                <CheckCircle className="h-4 w-4 mr-2" />
                Pending Approvals
              </span>
              <Badge variant="warning">{pendingApprovals}</Badge>
            </Link>
          )}
          {alerts > 0 && (
            <Link
              href="/dashboard#alerts"
              className="flex items-center justify-between p-2 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              <span className="flex items-center text-sm text-red-400">
                <Bell className="h-4 w-4 mr-2" />
                Active Alerts
              </span>
              <Badge variant="destructive">{alerts}</Badge>
            </Link>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.filter(isItemVisible).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.children &&
              item.children.some((child) => pathname.startsWith(child.href)))
          const isExpanded = expandedItems.includes(item.title)

          return (
            <div key={item.title}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpanded(item.title)}
                    className={cn(
                      'flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    {item.icon}
                    {!collapsed && (
                      <>
                        <span className="ml-3 flex-1 text-left">{item.title}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </>
                    )}
                  </button>
                  {!collapsed && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.filter(isChildVisible).map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block px-3 py-2 rounded-lg text-sm transition-colors',
                            pathname === child.href
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          )}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  {item.icon}
                  {!collapsed && <span className="ml-3">{item.title}</span>}
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-slate-800 p-3">
        {session?.user && (
          <div
            className={cn(
              'flex items-center',
              collapsed ? 'justify-center' : 'space-x-3'
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-600 text-white text-sm">
                {getInitials(session.user.fullName)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session.user.fullName}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {session.user.role}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
