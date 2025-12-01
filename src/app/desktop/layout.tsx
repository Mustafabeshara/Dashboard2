/**
 * Desktop Layout
 * Layout for the desktop application
 */

import { DesktopNav } from '@/components/desktop/desktop-nav';

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <DesktopNav />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}