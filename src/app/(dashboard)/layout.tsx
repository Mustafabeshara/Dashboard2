/**
 * Dashboard Layout with Sidebar
 */
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar pendingApprovals={3} alerts={2} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          notifications={[
            {
              id: '1',
              title: 'Budget Alert',
              message: 'Sales Department budget is at 85% consumption',
              time: '5 minutes ago',
              read: false,
            },
            {
              id: '2',
              title: 'Approval Required',
              message: 'New expense request of 15,000 KWD needs your approval',
              time: '1 hour ago',
              read: false,
            },
            {
              id: '3',
              title: 'Tender Update',
              message: 'MOH Cardiac tender submission deadline in 3 days',
              time: '2 hours ago',
              read: true,
            },
          ]}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
