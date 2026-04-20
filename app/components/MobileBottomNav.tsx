'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Tag, Plus, Banknote, LayoutGrid } from 'lucide-react';
import { useMobileMenu } from './MobileMenuContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { toggleMenu, isMobileMenuOpen, closeMenu } = useMobileMenu();

  const navItems = [
    { label: 'Inicio', path: '/', icon: Home },
    { label: 'Productos', path: '/productos', icon: Tag },
    // Center Action Button
    { label: 'Venta', path: '/ventas/nueva', icon: Plus, isAction: true },
    { label: 'Ventas', path: '/ventas', icon: Banknote },
    // Menu Trigger
    { label: 'Menú', trigger: true, icon: LayoutGrid }
  ];

  return (
    <div className="mobile-bottom-nav">
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        
        if (item.isAction) {
          return (
            <Link key={idx} href={item.path!} onClick={closeMenu} className="mobile-bottom-nav-action" style={{ textDecoration: 'none' }}>
              <div className="action-button">
                <Icon size={24} color="white" />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        }

        if (item.trigger) {
          const isActive = isMobileMenuOpen;
          return (
            <button key={idx} onClick={toggleMenu} className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={24} className="icon" />
              <span>{item.label}</span>
            </button>
          );
        }

        const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path!)) && !isMobileMenuOpen;

        return (
          <Link key={idx} href={item.path!} onClick={closeMenu} className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <Icon size={24} className="icon" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
