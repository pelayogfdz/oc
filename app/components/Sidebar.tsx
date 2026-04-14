'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Users, Tag, Package, Calculator, ArrowRightLeft, 
  BarChart3, Settings, Truck, PackageCheck,
  ChevronDown, ChevronUp, PlusCircle, Headset, Banknote, 
  FileText, Library, BookOpen, UserCircle, Briefcase, HandCoins
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
  { 
    title: 'Productos', icon: <Tag size={20} />, 
    items: [
      { name: 'Productos', path: '/productos' },
      { name: 'Traspasos', path: '/productos/traspasos' },
      { name: 'Ajuste de Inventario', path: '/productos/ajustes' },
      { name: 'Auditorías (Físico)', path: '/productos/auditorias' },
    ]
  },
  { 
    title: 'Ventas', icon: <Banknote size={20} />, 
    items: [
      { name: 'Ventas', path: '/ventas' },
      { name: 'Promociones y Descuentos', path: '/ventas/promociones' },
      { name: 'Devoluciones', path: '/ventas/devoluciones' },
      { name: 'Cotizaciones', path: '/ventas/cotizaciones' },
    ]
  },
  { 
    title: 'Clientes', icon: <UserCircle size={20} />, 
    items: [
      { name: 'Directorio', path: '/clientes' },
      { name: 'Cuentas por Cobrar', path: '/clientes/cobranza', badge: 'Cuentas' },
      { name: 'Portal de Autofacturación', path: '/clientes/portal' },
    ]
  },
  { 
    title: 'Caja', icon: <Briefcase size={20} />, 
    items: [
      { name: 'Caja Actual', path: '/caja/actual' },
      { name: 'Cortes Históricos', path: '/caja/cortes' },
    ]
  },
  { title: 'Reportes', path: '/reportes', icon: <BarChart3 size={20} /> },
  { 
    title: 'Compras y Gastos', icon: <PackageCheck size={20} />, 
    items: [
      { name: 'Compras a Proveedores', path: '/productos/compras' },
      { name: 'Gastos Operativos', path: '/productos/gastos' },
      { name: 'Directorio de Proveedores', path: '/proveedores' },
      { name: 'Cuentas por Pagar', path: '/proveedores/cuentas', badge: 'Pasivos' },
    ]
  },
  { 
    title: 'Facturas', icon: <FileText size={20} />, 
    items: [
      { name: 'Facturas por Ventas', path: '/facturas/ventas' },
      { name: 'Facturas Globales', path: '/facturas/globales' },
    ]
  },
  { 
    title: 'Omnicanalidad', icon: <Library size={20} />, badge: 'Enlace',
    items: [
      { name: 'Portal de Integraciones', path: '/integraciones' },
      { name: 'Catálogo de Tienda B2C', path: '/catalogo' },
    ]
  },
  { title: 'Conciliación Bancaria', path: '/conciliacion', icon: <HandCoins size={20} /> },
];

const footerNodes: MenuNode[] = [
  { title: 'Preferencias', path: '/preferencias', icon: <Settings size={20} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
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
    <aside style={{ 
      width: '260px', 
      backgroundColor: '#1B232D', /* Pulpos Dark Navy */
      color: '#cbd5e1', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
      overflowY: 'auto',
      fontSize: '0.9rem'
    }}>
      {/* Brand Header */}
      <div style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#00d0bb', fontSize: '2rem', lineHeight: 1 }}>*</span> 
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
          backgroundColor: '#374151', 
          color: '#bae6fd', 
          padding: '0.75rem 1rem', 
          borderRadius: '8px', 
          textDecoration: 'none',
          fontWeight: 'bold',
          transition: 'background 0.2s',
          fontSize: '1rem'
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: '50%', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
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
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '6px', 
                  textDecoration: 'none', 
                  backgroundColor: NodeActive ? '#0f172a' : 'transparent',
                  color: NodeActive ? '#00d0bb' : '#e2e8f0',
                  fontWeight: NodeActive ? 'bold' : '500',
                  transition: 'background 0.2s'
                }}
              >
                {node.icon}
                <span style={{ flex: 1 }}>{node.title}</span>
                {node.badge && (
                  <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '12px', fontWeight: 'bold' }}>
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
                  color: NodeActive && !isOpen ? '#00d0bb' : '#e2e8f0', // In pulpos, active parents look highlighted if closed
                  fontWeight: '500',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ color: NodeActive && !isOpen ? '#00d0bb' : '#94a3b8' }}>
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
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.4rem 0', 
                          textDecoration: 'none', 
                          color: ItemActive ? '#38bdf8' : '#e2e8f0', // highlight style for inner links
                          fontWeight: ItemActive ? 'bold' : '500',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span style={{ flex: 1 }}>{item.name}</span>
                        {item.badge && (
                          <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '12px', fontWeight: 'bold', marginRight: '0.5rem' }}>
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
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '0.75rem 1rem', 
              borderRadius: '6px', 
              textDecoration: 'none', 
              color: '#94a3b8',
              fontWeight: '500'
            }}
          >
            {node.icon}
            {node.title}
          </Link>
        ))}
      </nav>
      
    </aside>
  );
}
