'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMobileMenu } from './MobileMenuContext';
import { 
  ShoppingBag, Truck, Banknote, FileText, 
  Percent, BarChart3, Tag, ArrowRight,
  Briefcase, Calendar, Users, UserCircle,
  Store, Landmark, X
} from 'lucide-react';

export default function MobileGridMenu() {
  const { isMobileMenuOpen, closeMenu } = useMobileMenu();
  const pathname = usePathname();

  if (!isMobileMenuOpen) return null;

  const gridItems = [
    { title: 'Compras y Gastos', path: '/productos/compras', icon: <ShoppingBag size={24} color="#8b5cf6" /> },
    { title: 'Proveedores', path: '/proveedores', icon: <Truck size={24} color="#0d9488" /> },
    { title: 'Ventas', path: '/ventas', icon: <Banknote size={24} color="#16a34a" /> },
    { title: 'Cotizaciones', path: '/ventas/cotizaciones', icon: <FileText size={24} color="#16a34a" /> },
    { title: 'Facturas', path: '/facturas/ventas', icon: <FileText size={24} color="#16a34a" /> },
    { title: 'Facturas Globales', path: '/facturas/globales', icon: <FileText size={24} color="#16a34a" /> },
    { title: 'Promociones', path: '/ventas/promociones', icon: <Percent size={24} color="#0284c7" /> },
    { title: 'Reportes', path: '/reportes', icon: <BarChart3 size={24} color="#0284c7" /> },
    { title: 'Productos', path: '/productos', icon: <Tag size={24} color="#ea580c" /> },
    { title: 'Traspasos', path: '/productos/traspasos', icon: <ArrowRight size={24} color="#ea580c" /> },
    { title: 'Caja Actual', path: '/caja/actual', icon: <Briefcase size={24} color="#ea580c" /> },
    { title: 'Cortes Históricos', path: '/caja/cortes', icon: <Calendar size={24} color="#ea580c" /> },
    { title: 'Clientes', path: '/clientes', icon: <Users size={24} color="#0891b2" /> },
    { title: 'Portal de Clientes', path: '/clientes/portal', icon: <UserCircle size={24} color="#0891b2" /> },
    { title: 'Catálogo en Línea', path: '/catalogo', icon: <Store size={24} color="#c026d3" /> },
    { title: 'Conciliaciones', path: '/conciliacion', icon: <Landmark size={24} color="#e11d48" /> },
  ];

  return (
    <div className="mobile-grid-overlay">
      <div className="mobile-grid-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Menú</h2>
        <button onClick={closeMenu} style={{ padding: '0.5rem', color: 'var(--pulpos-text)' }}>
          <X size={24} />
        </button>
      </div>
      <div className="mobile-grid-content">
        <div className="mobile-grid">
          {gridItems.map((item, idx) => (
            <Link key={idx} href={item.path} onClick={closeMenu} className="mobile-grid-card">
              <div className="icon-wrapper">
                {item.icon}
              </div>
              <span className="title">{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
