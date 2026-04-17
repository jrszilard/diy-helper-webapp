'use client';

import AppSidebar from './AppSidebar';
import AppFooter from './AppFooter';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppSidebar />
      <div className="flex-1 md:ml-64 flex flex-col">
        <div className="flex-1">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}
