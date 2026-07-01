'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMobileMenu } from './MobileMenuContext';
import { 
  Home, Users, Tag, Package, Calculator, ArrowRightLeft, 
  BarChart3, Settings, Truck, PackageCheck,
  ChevronDown, ChevronUp, PlusCircle, Headset, Banknote, 
  FileText, Library, BookOpen, UserCircle, Briefcase, HandCoins, X, Sparkles, ShoppingCart
} from 'lucide-react';

type MenuItem = {
  name: string;
  path: string;
  badge?: string;
};

import { MenuNode, navStructure, footerNodes } from '../config/navigation';
import { ShieldAlert } from 'lucide-react';
import { hasNodeAccess } from '@/app/config/permissions';

export default function Sidebar({ isSuperAdmin, userPermissions = {}, userRole = 'USER' }: { isSuperAdmin?: boolean; userPermissions?: Record<string, boolean>; userRole?: string }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { isMobileMenuOpen, closeMenu } = useMobileMenu();

  const hasNodeVisible = (node: MenuNode) => {
    if (isSuperAdmin || userRole === 'OWNER' || userRole === 'ADMIN') {
      return true;
    }
    if (node.path) {
      return hasNodeAccess(userPermissions, node.requiredPermission, isSuperAdmin, userRole);
    }
    if (node.items) {
      return node.items.some(item => hasNodeAccess(userPermissions, item.requiredPermission, isSuperAdmin, userRole));
    }
    return true;
  };

  const renderMenuIcon = (icon: React.ReactNode) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, { size: 24 });
    }
    return icon;
  };

  // Auto-expand group if currently on a sub-path
  useEffect(() => {
    const newOpenGroups = { ...openGroups };
    navStructure.forEach(node => {
      if (node.items) {
        if (node.items.some(item => pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path)))) {
          newOpenGroups[node.title] = true;
        }
      }
    });
    setOpenGroups(newOpenGroups);
  }, []); // Only run once on mount

  const toggleGroup = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenGroups(prev => ({ [title]: !prev[title] }));
  };

  const isNodeActive = (node: MenuNode) => {
    if (node.path) {
      if (node.path === '/') return pathname === '/';
      return pathname.startsWith(node.path);
    }
    if (node.items) {
      return node.items.some(item => pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path)));
    }
    return false;
  };

  const isItemActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={closeMenu} 
      />
      <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{ 
        backgroundColor: 'var(--caanma-sidebar-bg)',
        color: 'var(--caanma-sidebar-text)', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',

      overflowY: 'auto',
      fontSize: '0.98rem'
    }}>
      {/* Brand Header */}
      <div style={{ padding: '1.125rem 1.5rem', marginBottom: '0.375rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'var(--caanma-text)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
          <div style={{
            width: '42px',
            height: '42px',
            backgroundColor: 'var(--caanma-primary)',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '24px',
          }}>
            C
          </div>
          <span style={{ fontWeight: 'bold', fontSize: '2.25rem' }}>CAANMA</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 'normal', color: '#94a3b8', verticalAlign: 'top', marginLeft: '0.375rem' }}>PRO</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav style={{ flex: 1, padding: '0.25rem 0.5rem 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        {navStructure.map((node) => {
          if (!hasNodeVisible(node)) return null;

          const NodeActive = isNodeActive(node);
          
          let content;
          if (node.path) {
            const isNuevaVenta = node.title === 'Nueva Venta';
            // Direct Link
            content = (
              <Link 
                href={node.path} 
                onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
                className={node.desktopOnly ? 'desktop-only-menu-item' : ''}
                style={isNuevaVenta ? {
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.9rem', 
                  padding: '0.6rem 0.9rem', 
                  borderRadius: '8px', 
                  textDecoration: 'none', 
                  backgroundColor: 'var(--caanma-primary)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.08rem',
                  transition: 'background 0.2s',
                  marginBottom: '0.48rem',
                  marginTop: '0.24rem'
                } : { 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.2rem', 
                  padding: '0.5rem 0.9rem', 
                  borderRadius: '8px', 
                  textDecoration: 'none', 
                  backgroundColor: NodeActive ? 'var(--caanma-sidebar-hover)' : 'transparent',
                  color: NodeActive ? 'var(--caanma-primary)' : 'inherit',
                  fontWeight: NodeActive ? 'bold' : '500',
                  transition: 'background 0.2s'
                }}
              >
                {isNuevaVenta ? (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
                    <span style={{ fontSize: '20px', lineHeight: 1, fontWeight: 'bold' }}>+</span>
                  </div>
                ) : renderMenuIcon(node.icon)}
                <span style={{ flex: 1 }}>{node.title}</span>
                {node.badge && (
                  <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', fontSize: '0.84rem', padding: '0.12rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' }}>
                    {node.badge}
                  </span>
                )}
              </Link>
            );
          } else {
            // Dropdown Group
            const isOpen = openGroups[node.title];
            
            content = (
              <div className={node.desktopOnly ? 'desktop-only-menu-item' : ''} style={{ display: 'flex', flexDirection: 'column' }}>
                <div 
                  onClick={(e) => toggleGroup(node.title, e)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1.2rem', 
                    padding: '0.5rem 0.9rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    color: NodeActive && !isOpen ? 'var(--caanma-primary)' : 'inherit', // In caanma, active parents look highlighted if closed
                    fontWeight: '500',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ color: NodeActive && !isOpen ? 'var(--caanma-primary)' : 'inherit' }}>
                    {renderMenuIcon(node.icon)}
                  </div>
                  <span style={{ flex: 1 }}>{node.title}</span>
                  {isOpen ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                </div>

                {isOpen && node.items && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '3.6rem', marginTop: '0.3rem', marginBottom: '0.6rem' }}>
                    {node.items.map(item => {
                      if (!hasNodeAccess(userPermissions, item.requiredPermission, isSuperAdmin, userRole)) {
                        return null;
                      }
                      const ItemActive = isItemActive(item.path);
                      return (
                        <Link 
                          key={item.name}
                          href={item.path} 
                          onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
                          className={item.desktopOnly ? 'desktop-only-menu-item' : ''}
                          style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.5rem 0', 
                            textDecoration: 'none', 
                            color: ItemActive ? 'var(--caanma-primary)' : 'inherit', // highlight style for inner links
                            fontWeight: ItemActive ? 'bold' : '500',
                            fontSize: '1.02rem'
                          }}
                        >
                          <span style={{ flex: 1 }}>{item.name}</span>
                          {item.badge && (
                            <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', fontSize: '0.78rem', padding: '0.12rem 0.5rem', borderRadius: '12px', fontWeight: 'bold', marginRight: '0.6rem' }}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={node.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              {content}
              {node.hasDividerAfter && (
                <div style={{ height: '1px', backgroundColor: 'var(--caanma-border)', margin: '0.6rem 0.3rem' }} />
              )}
            </div>
          );
        })}


        {/* Footer Items Wrapper */}
        <div style={{ marginTop: 'auto' }}>
          {footerNodes.filter(node => {
            return hasNodeAccess(userPermissions, node.requiredPermission, isSuperAdmin, userRole);
          }).map(node => (
            <Link 
              key={node.title}
              href={node.path!} 
              onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
              className={node.desktopOnly ? 'desktop-only-menu-item' : ''}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1.2rem', 
                padding: '0.5rem 0.9rem', 
                borderRadius: '8px', 
                textDecoration: 'none', 
                color: 'var(--caanma-text-muted)',
                fontWeight: '500'
              }}
            >
              {renderMenuIcon(node.icon)}
              {node.title}
            </Link>
          ))}
          
          {isSuperAdmin && (
            <Link 
              href="/admin" 
              onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1.2rem', 
                padding: '0.5rem 0.9rem', 
                marginTop: '0.6rem',
                borderRadius: '8px', 
                textDecoration: 'none', 
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontWeight: 'bold'
              }}
            >
              <ShieldAlert size={24} />
              Panel Global (Negocio)
            </Link>
          )}
        </div>
      </nav>
      
    </aside>
    </>
  );
}
 
