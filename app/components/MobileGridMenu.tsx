'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMobileMenu } from './MobileMenuContext';
import { navStructure, footerNodes } from '../config/navigation';
import { X, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

export default function MobileGridMenu({ isSuperAdmin, userPermissions = {}, userRole = 'USER' }: { isSuperAdmin?: boolean; userPermissions?: Record<string, boolean>; userRole?: string }) {
  const { isMobileMenuOpen, closeMenu } = useMobileMenu();
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  if (!isMobileMenuOpen) return null;

  const toggleGroup = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenGroup(prev => prev === title ? null : title);
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
        <button onClick={closeMenu} style={{ padding: '0.5rem', color: 'var(--caanma-text)' }}>
          <X size={24} />
        </button>
      </div>
      <div className="mobile-grid-content" style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: '100%' }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {!isSuperAdmin && navStructure.map((node) => {
            if (node.requiredPermission && userRole !== 'OWNER' && userRole !== 'ADMIN') {
              const reqs = Array.isArray(node.requiredPermission) ? node.requiredPermission : [node.requiredPermission];
              const hasAccess = reqs.some(req => userPermissions[req]);
              if (!hasAccess) return null;
            }
            const NodeActive = isNodeActive(node);
            
            let content;
            if (node.path) {
              const isNuevaVenta = node.title === 'Nueva Venta';
              content = (
                <Link 
                  href={node.path} 
                  onClick={closeMenu}
                  style={isNuevaVenta ? {
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', 
                    borderRadius: '8px', textDecoration: 'none', 
                    backgroundColor: 'var(--caanma-primary)',
                    color: 'white',
                    fontWeight: 'bold',
                    border: '1px solid var(--caanma-primary)',
                    marginBottom: '0.25rem'
                  } : { 
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                    borderRadius: '8px', textDecoration: 'none', 
                    backgroundColor: NodeActive ? 'rgba(139, 92, 246, 0.1)' : 'white',
                    color: NodeActive ? 'var(--caanma-primary)' : 'var(--caanma-text)',
                    fontWeight: NodeActive ? 'bold' : '500',
                    border: '1px solid var(--caanma-border)'
                  }}
                >
                  {isNuevaVenta ? (
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px' }}>
                      <span style={{ fontSize: '18px', lineHeight: 1, fontWeight: 'bold' }}>+</span>
                    </div>
                  ) : node.icon}
                  <span style={{ flex: 1 }}>{node.title}</span>
                </Link>
              );
            } else {
              const isOpen = openGroup === node.title;
              
              content = (
                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--caanma-border)', overflow: 'hidden' }}>
                  <div 
                    onClick={(e) => toggleGroup(node.title, e)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                      cursor: 'pointer',
                      color: NodeActive && !isOpen ? 'var(--caanma-primary)' : 'var(--caanma-text)',
                      fontWeight: '600'
                    }}
                  >
                    <div style={{ color: NodeActive && !isOpen ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)' }}>
                      {node.icon}
                    </div>
                    <span style={{ flex: 1 }}>{node.title}</span>
                    {isOpen ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                  </div>

                  {isOpen && node.items && (
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 1rem 1rem 3.5rem', gap: '0.75rem', backgroundColor: '#f8fafc', borderTop: '1px solid var(--caanma-border)' }}>
                      {node.items.map((item: any) => {
                        const ItemActive = isItemActive(item.path);
                        return (
                          <Link 
                            key={item.name}
                            href={item.path} 
                            onClick={closeMenu}
                            style={{ 
                              display: 'flex', alignItems: 'center', textDecoration: 'none', 
                              color: ItemActive ? 'var(--caanma-primary)' : '#475569',
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
            }

            return (
              <div key={node.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {content}
                {node.hasDividerAfter && (
                  <div style={{ height: '1px', backgroundColor: 'var(--caanma-border)', margin: '1rem 0' }} />
                )}
              </div>
            );
          })}

          {!isSuperAdmin && (
            <div style={{ height: '1px', backgroundColor: 'var(--caanma-border)', margin: '1rem 0' }} />
          )}

          {/* Footer Items */}
          {!isSuperAdmin && footerNodes.filter(node => {
            if (node.requiredPermission && userRole !== 'OWNER' && userRole !== 'ADMIN') {
              const reqs = Array.isArray(node.requiredPermission) ? node.requiredPermission : [node.requiredPermission];
              return reqs.some(req => userPermissions[req]);
            }
            return true;
          }).map(node => (
            <Link 
              key={node.title}
              href={node.path!} 
              onClick={closeMenu}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                borderRadius: '8px', textDecoration: 'none', 
                backgroundColor: 'white', border: '1px solid var(--caanma-border)',
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
              <span style={{ flex: 1 }}>Panel Global (Negocio)</span>
            </Link>
          )}

          <form action={async () => {
            const { logout } = await import('@/app/actions/auth-actions');
            await logout();
          }} style={{ marginTop: '0.5rem' }}>
            <button type="submit" style={{ 
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                borderRadius: '8px', width: '100%',
                backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', fontWeight: 'bold', cursor: 'pointer'
              }}>
              <span style={{ flex: 1, textAlign: 'left' }}>Cerrar Sesión</span>
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
