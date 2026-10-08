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
import { ShieldAlert, WifiOff } from 'lucide-react';
import { hasNodeAccess } from '@/app/config/permissions';
import { useOfflineSync } from './OfflineSyncProvider';

export default function Sidebar({ isSuperAdmin, userPermissions = {}, userRole = 'USER' }: { isSuperAdmin?: boolean; userPermissions?: Record<string, boolean>; userRole?: string }) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const { isMobileMenuOpen, closeMenu } = useMobileMenu();
  const { isOnline } = useOfflineSync();

  const hasNodeVisible = (node: MenuNode) => {
    if (node.localOnly) {
      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.endsWith('.local');
        if (!isLocalHost) return false;
      }
    }
    if (!isOnline) {
      // En modo offline, permitir Punto de Venta e Historial de Ventas
      if (node.path === '/ventas/nueva' || node.path === '/ventas') return true;
      if (node.items) {
        return node.items.some(item => !item.requiresOnline && (item.path === '/ventas' || item.path === '/ventas/nueva'));
      }
      return false;
    }
    if (isSuperAdmin || userRole === 'OWNER' || userRole === 'ADMIN') {
      return true;
    }
    if (node.path) {
      return hasNodeAccess(userPermissions, node.requiredPermission, isSuperAdmin, userRole);
    }
    if (node.items) {
      return node.items.some(item => {
        return hasNodeAccess(userPermissions, item.requiredPermission, isSuperAdmin, userRole);
      });
    }
    return true;
  };

  const renderMenuIcon = (icon: React.ReactNode) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, { size: 20 });
    }
    return icon;
  };

  // Auto-expand group if currently on a sub-path
  useEffect(() => {
    const activeNode = navStructure.find(node =>
      node.items && node.items.some(item => pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path)))
    );
    if (activeNode) {
      setOpenGroup(activeNode.title);
    }
  }, [pathname]);

  const toggleGroup = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenGroup(prev => prev === title ? null : title);
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
      <aside 
        className={`dashboard-sidebar ${isMobileMenuOpen ? 'open' : ''} bg-white flex flex-col h-screen border-r border-slate-200/90 shadow-xs overflow-y-auto select-none`}
      >
        {/* Brand Header */}
        <div className="p-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5 no-underline text-slate-900 group">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-xl flex items-center justify-center shadow-sm shadow-purple-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
              C
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="font-black text-xl tracking-tight text-slate-900">CAANMA</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md border border-purple-200/80">
                PRO
              </span>
            </div>
          </Link>

        {!isOnline && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.7rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            lineHeight: '1.3'
          }}>
            <WifiOff size={15} style={{ flexShrink: 0 }} />
            <span>Modo Offline Activo • Punto de Venta e Historial</span>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navStructure.map((node) => {
          if (!hasNodeVisible(node)) return null;

          const NodeActive = isNodeActive(node);
          
          let content;
          if (node.path) {
            const isNuevaVenta = node.title === 'Nueva Venta';
            content = (
              <Link 
                href={node.path} 
                onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
                className={`${node.desktopOnly ? 'desktop-only-menu-item ' : ''}${
                  isNuevaVenta 
                    ? 'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm shadow-purple-500/20 active:scale-[0.98] transition-all my-1.5'
                    : `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        NodeActive 
                          ? 'bg-purple-50 text-purple-700 font-bold' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`
                }`}
              >
                {isNuevaVenta ? (
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm leading-none flex-shrink-0">
                    +
                  </div>
                ) : (
                  <div className={`flex-shrink-0 ${NodeActive ? 'text-purple-600' : 'text-slate-400'}`}>
                    {renderMenuIcon(node.icon)}
                  </div>
                )}
                <span className="flex-1 truncate">{node.title}</span>
                {node.badge && (
                  <span className="bg-purple-100 text-purple-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                    {node.badge}
                  </span>
                )}
              </Link>
            );
          } else {
            const isOpen = openGroup === node.title;
            
            content = (
              <div className={`${node.desktopOnly ? 'desktop-only-menu-item ' : ''}flex flex-col`}>
                <div 
                  onClick={(e) => toggleGroup(node.title, e)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all ${
                    NodeActive && !isOpen 
                      ? 'text-purple-700 bg-purple-50/70 font-bold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className={`flex-shrink-0 ${NodeActive ? 'text-purple-600' : 'text-slate-400'}`}>
                    {renderMenuIcon(node.icon)}
                  </div>
                  <span className="flex-1 truncate">{node.title}</span>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                  )}
                </div>

                {isOpen && node.items && (
                  <div className="flex flex-col gap-0.5 ml-6 pl-3 border-l-2 border-slate-200 my-1">
                    {node.items.map(item => {
                      if (!isOnline && item.requiresOnline) return null;
                      if (!hasNodeAccess(userPermissions, item.requiredPermission, isSuperAdmin, userRole)) return null;
                      
                      const ItemActive = isItemActive(item.path);
                      return (
                        <Link 
                          key={item.name}
                          href={item.path} 
                          onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
                          className={`${item.desktopOnly ? 'desktop-only-menu-item ' : ''}flex items-center py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                            ItemActive 
                              ? 'bg-purple-50 text-purple-700 font-bold' 
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                          }`}
                        >
                          <span className="flex-1 truncate">{item.name}</span>
                          {item.badge && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-purple-200">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={node.title} className="flex flex-col">
              {content}
              {node.hasDividerAfter && (
                <div className="border-t border-slate-200 my-1.5 mx-2" />
              )}
            </div>
          );
        })}

        {/* Footer Navigation Items */}
        <div className="pt-3 mt-4 border-t border-slate-100 space-y-0.5">
          {footerNodes.filter(node => {
            return hasNodeAccess(userPermissions, node.requiredPermission, isSuperAdmin, userRole);
          }).map(node => (
            <Link 
              key={node.title}
              href={node.path!} 
              onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
              className={`${node.desktopOnly ? 'desktop-only-menu-item ' : ''}flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 transition-all`}
            >
              <div className="text-slate-400">
                {renderMenuIcon(node.icon)}
              </div>
              <span>{node.title}</span>
            </Link>
          ))}
          
          {isSuperAdmin && isOnline && (
            <Link 
              href="/admin" 
              onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
              className="flex items-center gap-3 px-3 py-2 mt-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
            >
              <ShieldAlert size={18} className="text-rose-600" />
              <span>Panel Global (Negocio)</span>
            </Link>
          )}
        </div>
      </nav>
      
    </aside>
    </>
  );
}
 
