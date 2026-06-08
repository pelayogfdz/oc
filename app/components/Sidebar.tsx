'use client';
import { useState, useEffect } from 'react';
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

export default function Sidebar({ isSuperAdmin, userPermissions = {}, userRole = 'USER' }: { isSuperAdmin?: boolean; userPermissions?: Record<string, boolean>; userRole?: string }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { isMobileMenuOpen, closeMenu } = useMobileMenu();

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
        backgroundColor: 'var(--pulpos-sidebar-bg)',
        color: 'var(--pulpos-sidebar-text)', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',

      overflowY: 'hidden',
      fontSize: '0.82rem'
    }}>
      {/* Brand Header */}
      <div style={{ padding: '0.75rem 1rem', marginBottom: '0.25rem' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'var(--pulpos-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <div style={{
            width: '28px',
            height: '28px',
            backgroundColor: 'var(--pulpos-primary)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
          }}>
            C
          </div>
          <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>CAANMA</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8', verticalAlign: 'top', marginLeft: '0.25rem' }}>PRO</span>
        </Link>
      </div>
      
      {/* Nueva Venta Button */}
      {!isSuperAdmin && (
        <div style={{ padding: '0 0.75rem', marginBottom: '0.5rem' }}>
          <Link href="/ventas/nueva" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            width: '100%', 
            backgroundColor: 'var(--pulpos-primary)', 
            color: 'white', 
            padding: '0.5rem 0.75rem', 
            borderRadius: '8px', 
            textDecoration: 'none',
            fontWeight: 'bold',
            transition: 'background 0.2s',
            fontSize: '0.9rem'
          }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
              <span style={{ fontSize: '16px', lineHeight: 1, fontWeight: 'bold' }}>+</span>
            </div>
            Nueva Venta
          </Link>
        </div>
      )}

      {/* Main Navigation */}
      <nav style={{ flex: 1, padding: '0.25rem 0.5rem 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        {navStructure.map((node) => {
          // Check permissions
          if (!isSuperAdmin && node.requiredPermission && userRole !== 'OWNER' && userRole !== 'ADMIN') {
            const reqs = Array.isArray(node.requiredPermission) ? node.requiredPermission : [node.requiredPermission];
            const hasAccess = reqs.some(req => userPermissions[req]);
            if (!hasAccess) return null;
          }

          const NodeActive = isNodeActive(node);
          
          if (node.path) {
            // Direct Link
            return (
              <Link 
                key={node.title}
                href={node.path} 
                onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
                className={node.desktopOnly ? 'desktop-only-menu-item' : ''}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.4rem 0.75rem', 
                  borderRadius: '6px', 
                  textDecoration: 'none', 
                  backgroundColor: NodeActive ? 'var(--pulpos-sidebar-hover)' : 'transparent',
                  color: NodeActive ? 'var(--pulpos-primary)' : 'inherit',
                  fontWeight: NodeActive ? 'bold' : '500',
                  transition: 'background 0.2s'
                }}
              >
                {node.icon}
                <span style={{ flex: 1 }}>{node.title}</span>
                {node.badge && (
                  <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '12px', fontWeight: 'bold' }}>
                    {node.badge}
                  </span>
                )}
              </Link>
            );
          }

          // Dropdown Group
          const isOpen = openGroups[node.title];
          
          return (
            <div key={node.title} style={{ display: 'flex', flexDirection: 'column' }} className={node.desktopOnly ? 'desktop-only-menu-item' : ''}>
              <div 
                onClick={(e) => toggleGroup(node.title, e)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.4rem 0.75rem', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  color: NodeActive && !isOpen ? 'var(--pulpos-primary)' : 'inherit', // In pulpos, active parents look highlighted if closed
                  fontWeight: '500',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ color: NodeActive && !isOpen ? 'var(--pulpos-primary)' : 'inherit' }}>
                  {node.icon}
                </div>
                <span style={{ flex: 1 }}>{node.title}</span>
                {isOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
              </div>

              {isOpen && node.items && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '3rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  {node.items.map(item => {
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
                          padding: '0.4rem 0', 
                          textDecoration: 'none', 
                          color: ItemActive ? 'var(--pulpos-primary)' : 'inherit', // highlight style for inner links
                          fontWeight: ItemActive ? 'bold' : '500',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span style={{ flex: 1 }}>{item.name}</span>
                        {item.badge && (
                          <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '12px', fontWeight: 'bold', marginRight: '0.5rem' }}>
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
        })}


        {/* Footer Items Wrapper */}
        <div style={{ marginTop: 'auto' }}>
          {footerNodes.filter(node => {
            if (!isSuperAdmin && node.requiredPermission && userRole !== 'OWNER' && userRole !== 'ADMIN') {
              const reqs = Array.isArray(node.requiredPermission) ? node.requiredPermission : [node.requiredPermission];
              return reqs.some(req => userPermissions[req]);
            }
            return true;
          }).map(node => (
            <Link 
              key={node.title}
              href={node.path!} 
              onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
              className={node.desktopOnly ? 'desktop-only-menu-item' : ''}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '0.4rem 0.75rem', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                color: 'var(--pulpos-text-muted)',
                fontWeight: '500'
              }}
            >
              {node.icon}
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
                gap: '1rem', 
                padding: '0.4rem 0.75rem', 
                marginTop: '0.5rem',
                borderRadius: '6px', 
                textDecoration: 'none', 
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontWeight: 'bold'
              }}
            >
              <ShieldAlert size={20} />
              Panel Global (Negocio)
            </Link>
          )}
        </div>
      </nav>
      
    </aside>
    </>
  );
}
 
