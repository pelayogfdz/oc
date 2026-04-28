'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMobileMenu } from './MobileMenuContext';
import { navStructure, footerNodes } from '../config/navigation';
import { X, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

export default function MobileGridMenu({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  const { isMobileMenuOpen, closeMenu } = useMobileMenu();
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navStructure.forEach(node => {
      if (node.items) initialState[node.title] = true;
    });
    return initialState;
  });

  if (!isMobileMenuOpen) return null;

  const toggleGroup = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const isNodeActive = (node: any) => {
    if (node.path) {
      if (node.path === '/') return pathname === '/';
      return pathname.startsWith(node.path);
    }
    if (node.items) {
      return node.items.some((item: any) => pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path)));
    }
    return false;
  };

  const isItemActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <div className="mobile-grid-overlay">
      <div className="mobile-grid-header" style={{ position: 'sticky', top: 0, zIndex: 92, background: 'white' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Menú Principal</h2>
        <button onClick={closeMenu} style={{ padding: '0.5rem', color: 'var(--pulpos-text)' }}>
          <X size={24} />
        </button>
      </div>
      <div className="mobile-grid-content" style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navStructure.map((node) => {
            const NodeActive = isNodeActive(node);
            
            if (node.path) {
              return (
                <Link 
                  key={node.title}
                  href={node.path} 
                  onClick={closeMenu}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                    borderRadius: '8px', textDecoration: 'none', 
                    backgroundColor: NodeActive ? 'rgba(139, 92, 246, 0.1)' : 'white',
                    color: NodeActive ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
                    fontWeight: NodeActive ? 'bold' : '500',
                    border: '1px solid var(--pulpos-border)'
                  }}
                >
                  {node.icon}
                  <span style={{ flex: 1 }}>{node.title}</span>
                </Link>
              );
            }

            const isOpen = openGroups[node.title];
            
            return (
              <div key={node.title} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--pulpos-border)', overflow: 'hidden' }}>
                <div 
                  onClick={(e) => toggleGroup(node.title, e)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                    cursor: 'pointer',
                    color: NodeActive && !isOpen ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
                    fontWeight: '600'
                  }}
                >
                  <div style={{ color: NodeActive && !isOpen ? 'var(--pulpos-primary)' : 'var(--pulpos-text-muted)' }}>
                    {node.icon}
                  </div>
                  <span style={{ flex: 1 }}>{node.title}</span>
                  {isOpen ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                </div>

                {isOpen && node.items && (
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 1rem 1rem 3.5rem', gap: '0.75rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--pulpos-border)' }}>
                    {node.items.map((item: any) => {
                      const ItemActive = isItemActive(item.path);
                      return (
                        <Link 
                          key={item.name}
                          href={item.path} 
                          onClick={closeMenu}
                          style={{ 
                            display: 'flex', alignItems: 'center', textDecoration: 'none', 
                            color: ItemActive ? 'var(--pulpos-primary)' : '#475569',
                            fontWeight: ItemActive ? 'bold' : '500',
                            fontSize: '0.95rem'
                          }}
                        >
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ height: '1px', backgroundColor: 'var(--pulpos-border)', margin: '1rem 0' }} />

          {/* Footer Items */}
          {footerNodes.map(node => (
            <Link 
              key={node.title}
              href={node.path!} 
              onClick={closeMenu}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                borderRadius: '8px', textDecoration: 'none', 
                backgroundColor: 'white', border: '1px solid var(--pulpos-border)',
                color: '#475569', fontWeight: '500'
              }}
            >
              {node.icon}
              <span style={{ flex: 1 }}>{node.title}</span>
            </Link>
          ))}

          {isSuperAdmin && (
            <Link 
              href="/admin" 
              onClick={closeMenu}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                borderRadius: '8px', textDecoration: 'none', 
                backgroundColor: '#fee2e2', border: '1px solid #fecaca',
                color: '#dc2626', fontWeight: 'bold'
              }}
            >
              <ShieldAlert size={20} />
              <span style={{ flex: 1 }}>Super Admin</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
