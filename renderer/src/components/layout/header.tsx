/**
 * Header Component
 */
'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Bell, Search, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

// Map paths to page titles
const pathTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/budgets': 'Budgets',
  '/budgets/create': 'Create Budget',
  '/budgets/approvals': 'Budget Approvals',
  '/budgets/reports': 'Budget Reports',
  '/tenders': 'Tenders',
  '/tenders/create': 'Create Tender',
  '/tenders/pipeline': 'Tender Pipeline',
  '/inventory': 'Inventory',
  '/inventory/products': 'Products',
  '/inventory/alerts': 'Stock Alerts',
  '/customers': 'Customers',
  '/expenses': 'Expenses',
  '/expenses/create': 'Submit Expense',
  '/expenses/pending': 'Pending Expenses',
  '/invoices': 'Invoices',
  '/suppliers': 'Suppliers',
  '/reports': 'Reports',
  '/users': 'Users',
  '/settings': 'Settings',
}

interface HeaderProps {
  notifications?: {
    id: string
    title: string
    message: string
    time: string
    read: boolean
  }[]
}

export function Header({ notifications = [] }: HeaderProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Get page title based on current path
  const getPageTitle = () => {
    // Check exact match first
    if (pathTitles[pathname]) return pathTitles[pathname]

    // Check for dynamic routes (e.g., /budgets/[id])
    const pathParts = pathname.split('/')
    if (pathParts.length >= 2) {
      const basePath = `/${pathParts[1]}`
      if (pathTitles[basePath]) {
        return `${pathTitles[basePath]} Details`
      }
    }

    return 'Dashboard'
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
        {session?.user?.department && (
          <p className="text-sm text-gray-500">{session.user.department} Department</p>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 pl-9 bg-gray-50 border-gray-200"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-500" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between w-full">
                    <span
                      className={`font-medium text-sm ${
                        notification.read ? 'text-gray-600' : 'text-gray-900'
                      }`}
                    >
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {notification.message}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    {notification.time}
                  </span>
                </DropdownMenuItem>
              ))
            )}
            {notifications.length > 5 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center text-sm text-blue-600 cursor-pointer">
                  View all notifications
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5 text-gray-500" />
        </Button>
      </div>
    </header>
  )
}
