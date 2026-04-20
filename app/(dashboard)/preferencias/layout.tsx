'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Users, Store, Banknote, Shield, CheckCircle, Smartphone, MapPin, HardDrive, LayoutTemplate, Box, FileText, List, Star, Zap, CreditCard, Wrench, Bell } from 'lucide-react';

const prefTabs = [
  { name: 'Configuración General', path: '/preferencias/general', icon: <Settings size={18} /> },
  { name: 'Usuarios y Permisos', path: '/preferencias/usuarios', icon: <Users size={18} /> },
  { name: 'Vendedores y Comisiones', path: '/preferencias/vendedores', icon: <Star size={18} /> },
  { name: 'Impresoras Térmicas', path: '/preferencias/impresoras', icon: <HardDrive size={18} /> },
  { name: 'Plantillas de Tickets', path: '/preferencias/tickets', icon: <LayoutTemplate size={18} /> },
  { name: 'Sucursales y Almacenes', path: '/preferencias/sucursales', icon: <Store size={18} /> },
  { name: 'Punto de Venta', path: '/preferencias/ventas', icon: <Banknote size={18} /> },
  { name: 'Cotizaciones', path: '/preferencias/cotizaciones', icon: <FileText size={18} /> },
  { name: 'Terminales y Cajas', path: '/preferencias/cajas', icon: <Shield size={18} /> },
  { name: 'Catálogo de Productos', path: '/preferencias/productos', icon: <Box size={18} /> },
  { name: 'Facturación CFDI', path: '/preferencias/facturacion', icon: <FileText size={18} /> },
  { name: 'Listas de Precios', path: '/preferencias/listas-de-precios', icon: <List size={18} /> },
  { name: 'Cartera de Clientes', path: '/preferencias/clientes', icon: <Users size={18} /> },
  { name: 'Recargas Electrónicas', path: '/preferencias/recargas', icon: <Smartphone size={18} /> },
  { name: 'Cuentas Bancarias', path: '/preferencias/bancos', icon: <CreditCard size={18} /> },
  { name: 'Métodos de Pago (SAT)', path: '/preferencias/metodos', icon: <CheckCircle size={18} /> },
  { name: 'Recetas de Producción', path: '/preferencias/fabricacion', icon: <Wrench size={18} /> },
  { name: 'Notificaciones', path: '/preferencias/notificaciones', icon: <Bell size={18} /> },
];

import InstallPWAButton from '@/app/components/InstallPWAButton';

export default function PreferenciasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', gap: '2rem', maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 100px)' }}>
      
      {/* 18-tab Sidebar */}
      <aside style={{ width: '280px', flexShrink: 0, backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--pulpos-border)', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '1rem', paddingLeft: '1rem' }}>PREFERENCIAS</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 1rem' }}>
          {prefTabs.map(tab => {
            const isActive = pathname === tab.path || (pathname === '/preferencias' && tab.path === '/preferencias/general');
            return (
              <Link 
                key={tab.name} 
                href={tab.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--pulpos-primary)' : 'var(--pulpos-text)',
                  backgroundColor: isActive ? 'var(--pulpos-sidebar-hover)' : 'transparent',
                  fontWeight: isActive ? 'bold' : '500',
                  fontSize: '0.9rem',
                  transition: 'background 0.2s'
                }}
              >
                {tab.icon}
                {tab.name}
              </Link>
            )
          })}
        </div>
        <InstallPWAButton />
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

    </div>
  );
}
