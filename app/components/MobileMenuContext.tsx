'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface MobileMenuContextType {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (o: boolean) => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextType>({
  isMobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  closeMenu: () => {},
  toggleMenu: () => {},
});

export const MobileMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const closeMenu = () => setMobileMenuOpen(false);
  const toggleMenu = () => setMobileMenuOpen(!isMobileMenuOpen);

  return (
    <MobileMenuContext.Provider value={{ isMobileMenuOpen, setMobileMenuOpen, closeMenu, toggleMenu }}>
      {children}
    </MobileMenuContext.Provider>
  );
};

export const useMobileMenu = () => useContext(MobileMenuContext);
