import React from 'react';
import SiteNavigation from './SiteNavigation';
import { cn } from '../lib/utils';
import { useUi } from '../contexts/UiContext';
import CompareDrawer from './CompareDrawer';
import ChartLoggingDashboard from './ChartLoggingDashboard';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen, setIsSidebarOpen, pinnedTerms } = useUi();

  return (
    <div className="h-screen bg-platform-background text-platform-text flex overflow-hidden">
      <aside className={cn(
        "border-r border-platform-contrast flex flex-col transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-16"
      )}>
        <SiteNavigation isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      </aside>
      <main className={cn(
        "flex-1 p-6 overflow-y-auto",
        pinnedTerms.length > 0 && "pb-48" // Add padding for the drawer
      )}>
        {children}
      </main>
      <CompareDrawer />
      <ChartLoggingDashboard />
    </div>
  );
};

export default MainLayout;