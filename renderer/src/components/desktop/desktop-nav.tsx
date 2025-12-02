/**
 * Desktop Navigation
 * Navigation component for the desktop application
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  Brain,
  Database,
  Settings,
  Users,
  BarChart3,
  Wallet,
  Package,
  FileSpreadsheet,
  Building,
  ShoppingCart,
  Calendar,
  Bell,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

const desktopNavItems = [
  {
    title: 'Dashboard',
    href: '/desktop',
    icon: LayoutDashboard,
  },
  {
    title: 'AI Features',
    href: '/desktop/ai-features',
    icon: Brain,
  },
  {
    title: 'Documents',
    href: '/desktop/documents',
    icon: FileText,
  },
  {
    title: 'Tenders',
    href: '/desktop/tenders',
    icon: FileSpreadsheet,
  },
  {
    title: 'Inventory',
    href: '/desktop/inventory',
    icon: Package,
  },
  {
    title: 'Customers',
    href: '/desktop/customers',
    icon: Users,
  },
  {
    title: 'Suppliers',
    href: '/desktop/suppliers',
    icon: Building,
  },
  {
    title: 'Expenses',
    href: '/desktop/expenses',
    icon: Wallet,
  },
  {
    title: 'Reports',
    href: '/desktop/reports',
    icon: BarChart3,
  },
  {
    title: 'Calendar',
    href: '/desktop/calendar',
    icon: Calendar,
  },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-4">
        <h1 className="text-lg font-bold">Medical Dashboard</h1>
      </div>
      
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900',
                  isActive && 'bg-gray-100 text-gray-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="border-t p-4">
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <HelpCircle className="h-4 w-4" />
            Help
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}