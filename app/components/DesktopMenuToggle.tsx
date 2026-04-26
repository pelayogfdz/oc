'use client';
import { Menu } from 'lucide-react';
import { useMobileMenu } from './MobileMenuContext';

export default function DesktopMenuToggle() {
  const { toggleDesktopSidebar } = useMobileMenu();

  return (
    <button 
      onClick={toggleDesktopSidebar}
      className="desktop-menu-toggle"
      style={{
        background: 'none',
        border: 'none',
        padding: '0.5rem',
        cursor: 'pointer',
        color: 'var(--pulpos-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Menu size={24} />
    </button>
  );
}
