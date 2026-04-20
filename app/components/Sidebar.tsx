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

type MenuNode = {
  title: string;
  path?: string; // If it's a direct link
  icon?: React.ReactNode;
  badge?: string;
  items?: MenuItem[]; // If it's a dropdown
};

const navStructure: MenuNode[] = [
  { title: 'Inicio', path: '/', icon: <Home size={20} /> },
  { title: 'Asistente IA (Alina)', path: '/ia', icon: <Sparkles size={20} className="text-purple-500" />, badge: 'Gemini' },
  { 
    title: 'Ventas', icon: <Banknote size={20} />, 
    items: [
      { name: 'Historial de Ventas', path: '/ventas' },
      { name: 'Promociones y Descuentos', path: '/ventas/promociones' },
      { name: 'Devoluciones', path: '/ventas/devoluciones' },
      { name: 'Cotizaciones', path: '/ventas/cotizaciones' },
    ]
  },
  { 
    title: 'Caja', icon: <Briefcase size={20} />, 
    items: [
      { name: 'Apertura y Corte de Caja', path: '/caja/actual' },
      { name: 'Histórico de Cortes', path: '/caja/cortes' },
    ]
  },
  { 
    title: 'Facturación', icon: <FileText size={20} />, 
    items: [
      { name: 'Facturación CFDI 4.0', path: '/facturas/ventas' },
      { name: 'Factura Global (Público en General)', path: '/facturas/globales' },
      { name: 'Complementos de Pago (REP)', path: '/facturas/complementos', badge: 'REP' },
    ]
  },
  { 
    title: 'Clientes', icon: <UserCircle size={20} />, 
    items: [
      { name: 'Directorio de Clientes', path: '/clientes' },
      { name: 'Cobranza (CxC)', path: '/clientes/cobranza', badge: 'Pendientes' },
      { name: 'Portal de Autofacturación', path: '/clientes/portal' },
    ]
  },
  { 
    title: 'Inventario y Productos', icon: <Tag size={20} />, 
    items: [
      { name: 'Catálogo de Productos', path: '/productos' },
      { name: 'Actualización Masiva de Precios', path: '/productos/precios-masivos', badge: 'Precios' },
      { name: 'Costos y Proveedores', path: '/productos/costos-proveedor', badge: 'Costos' },
      { name: 'Traspasos entre Sucursales', path: '/productos/traspasos' },
      { name: 'Ajustes de Inventario', path: '/productos/ajustes' },
      { name: 'Toma Física de Inventario', path: '/productos/auditorias' },
    ]
  },
  { 
    title: 'Compras y Gastos', icon: <ShoppingCart size={20} />, 
    items: [
      { name: 'Órdenes de Compra', path: '/productos/compras' },
      { name: 'Pedidos', path: '/productos/pedidos' },
      { name: 'Registro de Gastos', path: '/productos/gastos' },
      { name: 'Directorio de Proveedores', path: '/proveedores' },
      { name: 'Cuentas por Pagar (CxP)', path: '/proveedores/cuentas', badge: 'Pasivos' },
    ]
  },
  { 
    title: 'Ventas Online', icon: <Library size={20} />, badge: 'Enlace',
    items: [
      { name: 'Integraciones (Mercado Libre/Amazon)', path: '/integraciones' },
      { name: 'Catálogo E-commerce B2C', path: '/catalogo' },
    ]
  },
  { title: 'Finanzas', path: '/conciliacion', icon: <HandCoins size={20} /> },
  { title: 'Reportes y BI', path: '/reportes', icon: <BarChart3 size={20} /> },
];

const footerNodes: MenuNode[] = [
  { title: 'Preferencias', path: '/preferencias', icon: <Settings size={20} /> },
];

export default function Sidebar() {
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

      overflowY: 'auto',
      fontSize: '0.9rem'
    }}>
      {/* Brand Header */}
      <div style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--pulpos-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--pulpos-primary)', fontSize: '2rem', lineHeight: 1 }}>*</span> 
          CAANMA
          <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8', verticalAlign: 'top', marginLeft: '0.25rem' }}>PRO</span>
        </div>
      </div>
      
      {/* Nueva Venta Button */}
      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <Link href="/ventas/nueva" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          width: '100%', 
          backgroundColor: 'var(--pulpos-primary)', 
          color: 'white', 
          padding: '0.75rem 1rem', 
          borderRadius: '8px', 
          textDecoration: 'none',
          fontWeight: 'bold',
          transition: 'background 0.2s',
          fontSize: '1rem'
        }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1, fontWeight: 'bold' }}>+</span>
          </div>
          Nueva Venta
        </Link>
      </div>

      {/* Main Navigation */}
      <nav style={{ flex: 1, padding: '0.5rem 1rem 2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navStructure.map((node) => {
          const NodeActive = isNodeActive(node);
          
          if (node.path) {
            // Direct Link
            return (
              <Link 
                key={node.title}
                href={node.path} 
                onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.75rem 1rem', 
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
            <div key={node.title} style={{ display: 'flex', flexDirection: 'column' }}>
              <div 
                onClick={(e) => toggleGroup(node.title, e)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.75rem 1rem', 
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



        {/* Footer Items */}
        {footerNodes.map(node => (
          <Link 
            key={node.title}
            href={node.path!} 
            onClick={() => { if (isMobileMenuOpen) closeMenu(); }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '0.75rem 1rem', 
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
      </nav>
      
    </aside>
    </>
  );
}
