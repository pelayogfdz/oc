'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Layers, Receipt } from 'lucide-react';

export default function FacturasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Facturación Ventas', path: '/facturas/ventas', icon: <FileText size={18} /> },
    { name: 'Factura Global', path: '/facturas/globales', icon: <Layers size={18} /> },
    { name: 'Complementos de Pago (REP)', path: '/facturas/complementos', icon: <Receipt size={18} /> },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Premium Tab bar */}
      <div style={{ 
        display: 'flex', 
        gap: '0.25rem', 
        borderBottom: '1px solid var(--caanma-border)', 
        marginBottom: '2rem',
        paddingBottom: '0.1rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {tabs.map(tab => {
          const isActive = pathname === tab.path || (pathname === '/facturas' && tab.path === '/facturas/ventas');
          return (
            <Link
              key={tab.path}
              href={tab.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px 8px 0 0',
                textDecoration: 'none',
                color: isActive ? 'var(--caanma-primary)' : 'var(--caanma-text-muted)',
                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                borderBottom: isActive ? '3px solid var(--caanma-primary)' : '3px solid transparent',
                fontWeight: isActive ? 'bold' : '500',
                fontSize: '0.95rem',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.name}
            </Link>
          );
        })}
      </div>
      <div>{children}</div>
    </div>
  );
}
