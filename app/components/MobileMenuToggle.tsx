'use client';
import { Menu, X } from 'lucide-react';
import { useMobileMenu } from './MobileMenuContext';

export default function MobileMenuToggle() {
  const { isMobileMenuOpen, toggleMenu } = useMobileMenu();

  return (
    <button 
      onClick={toggleMenu}
      className="mobile-menu-toggle"
      style={{
        display: 'none', // handled by CSS media query
        background: 'none',
        border: 'none',
        padding: '0.5rem',
        cursor: 'pointer',
        color: 'var(--pulpos-text)',
      }}
    >
      {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
}
