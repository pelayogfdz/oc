'use client';

import { useMobileMenu } from './MobileMenuContext';

export default function DesktopSidebarWrapper({ children }: { children: React.ReactNode }) {
  const { isDesktopSidebarCollapsed } = useMobileMenu();

  return (
    <div className={`desktop-sidebar-wrapper ${isDesktopSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {children}
    </div>
  );
}
