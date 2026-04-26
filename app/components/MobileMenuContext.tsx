'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface MobileMenuContextType {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (o: boolean) => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  isDesktopSidebarCollapsed: boolean;
  toggleDesktopSidebar: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextType>({
  isMobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  closeMenu: () => {},
  toggleMenu: () => {},
  isDesktopSidebarCollapsed: false,
  toggleDesktopSidebar: () => {},
});

export const MobileMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // Close menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const closeMenu = () => setMobileMenuOpen(false);
  const toggleMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const toggleDesktopSidebar = () => setDesktopSidebarCollapsed(!isDesktopSidebarCollapsed);

  return (
    <MobileMenuContext.Provider value={{ 
      isMobileMenuOpen, setMobileMenuOpen, closeMenu, toggleMenu,
      isDesktopSidebarCollapsed, toggleDesktopSidebar 
    }}>
      {children}
    </MobileMenuContext.Provider>
  );
};

export const useMobileMenu = () => useContext(MobileMenuContext);
