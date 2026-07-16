'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, History, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CobranzaGlobalClient({ initialData }: { initialData: any[] }) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NOT_OVERDUE' | '0_15' | '15_30' | '30_60' | '60_90' | '90_PLUS'>('ALL');

  const getDaysOverdue = (dueDateStr: string | null | undefined): number => {
    if (!dueDateStr) return -1;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    if (diffTime <= 0) return 0;
    
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const buckets = {
    ALL: { label: 'Todos', sales: [] as any[], total: 0 },
    NOT_OVERDUE: { label: 'Sin Vencer', sales: [] as any[], total: 0 },
    '0_15': { label: '0 a 15 días', sales: [] as any[], total: 0 },
    '15_30': { label: '15 a 30 días', sales: [] as any[], total: 0 },
    '30_60': { label: '30 a 60 días', sales: [] as any[], total: 0 },
    '60_90': { label: '60 a 90 días', sales: [] as any[], total: 0 },
    '90_PLUS': { label: 'Más de 90 días', sales: [] as any[], total: 0 }
  };

  initialData.forEach(sale => {
    const days = getDaysOverdue(sale.dueDate);
    buckets.ALL.sales.push(sale);
    buckets.ALL.total += sale.balanceDue || 0;

    if (days === 0 || days === -1) {
      buckets.NOT_OVERDUE.sales.push(sale);
      buckets.NOT_OVERDUE.total += sale.balanceDue || 0;
    } else if (days > 0 && days <= 15) {
      buckets['0_15'].sales.push(sale);
      buckets['0_15'].total += sale.balanceDue || 0;
    } else if (days > 15 && days <= 30) {
      buckets['15_30'].sales.push(sale);
      buckets['15_30'].total += sale.balanceDue || 0;
    } else if (days > 30 && days <= 60) {
      buckets['30_60'].sales.push(sale);
      buckets['30_60'].total += sale.balanceDue || 0;
    } else if (days > 60 && days <= 90) {
      buckets['60_90'].sales.push(sale);
      buckets['60_90'].total += sale.balanceDue || 0;
    } else if (days > 90) {
      buckets['90_PLUS'].sales.push(sale);
      buckets['90_PLUS'].total += sale.balanceDue || 0;
    }
  });

  const activeBucketSales = buckets[activeFilter].sales;

  const filteredSales = activeBucketSales.filter(sale => {
    const term = search.toLowerCase();
    const customerMatch = sale.customer?.name?.toLowerCase().includes(term);
    const saleIdMatch = sale.id.toLowerCase().includes(term);
    const folioMatch = sale.folio?.toLowerCase().includes(term);
    return customerMatch || saleIdMatch || folioMatch;
  });

  const totalDeudaGlobal = filteredSales.reduce((acc, sale) => acc + (sale.balanceDue || 0), 0);

  return (
    <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: '#94a3b8' }} />
                <input 
                    type="text" 
                    placeholder="Buscar por cliente o folio de venta..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
            </div>
            <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontWeight: 'bold' }}>
                Deuda Global Filtrada: {formatCurrency(totalDeudaGlobal, 2)}
            </div>
        </div>

        {/* Filtros de Vencimiento */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          {(Object.keys(buckets) as Array<keyof typeof buckets>).map((key) => {
            const bucket = buckets[key];
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  border: isActive ? '1px solid var(--caanma-primary)' : '1px solid #e2e8f0',
                  backgroundColor: isActive ? 'rgba(109, 40, 217, 0.08)' : 'white',
                  color: isActive ? 'var(--caanma-primary)' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 1px 3px rgba(109, 40, 217, 0.1)' : 'none'
                }}
              >
                <span>{bucket.label}</span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  backgroundColor: isActive ? 'var(--caanma-primary)' : '#f1f5f9', 
                  color: isActive ? 'white' : '#64748b', 
                  padding: '0.1rem 0.4rem', 
                  borderRadius: '9999px',
                  fontWeight: 'bold'
                }}>
                  {bucket.sales.length}
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  ({formatCurrency(bucket.total, 2)})
                </span>
              </button>
            );
          })}
        </div>

        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Cliente</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Folio / Ticket</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Fecha de Creación</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Vencimiento</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Deuda Actual</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--caanma-border)' }}>Acción</th>
                </tr>
            </thead>
            <tbody>
                {filteredSales.map((sale: any) => {
                    const overdue = sale.dueDate ? new Date(sale.dueDate) < new Date() : false;
                    return (
                        <tr key={sale.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                            <td data-label="Cliente" style={{ padding: '1rem', fontWeight: 'bold' }}>
                                {sale.customer?.name || 'Venta de Mostrador'}
                            </td>
                            <td data-label="Folio / Ticket" style={{ padding: '1rem', color: '#64748b', fontFamily: 'monospace', fontWeight: '500' }}>
                                {sale.folio ? `#${sale.folio}` : `#${sale.id.slice(0,8).toUpperCase()}`}
                            </td>
                            <td data-label="Fecha de Creación" style={{ padding: '1rem', color: '#64748b' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                            <td data-label="Vencimiento" style={{ padding: '1rem', fontWeight: 'bold', color: overdue ? '#dc2626' : '#16a34a' }}>
                                {sale.dueDate ? new Date(sale.dueDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td data-label="Deuda Actual" style={{ padding: '1rem', fontWeight: 'bold', color: '#dc2626', fontSize: '1.1rem' }}>
                                {formatCurrency(sale.balanceDue, 2)}
                            </td>
                            <td data-label="Acción" style={{ padding: '1rem' }}>
                                {sale.customer?.id && (
                                    <Link href={`/clientes/${sale.customer.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', color: '#4f46e5', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                        Ir al Perfil y Abonar <ArrowRight size={14}/>
                                    </Link>
                                )}
                            </td>
                        </tr>
                    )
                })}
                {filteredSales.length === 0 && (
                    <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            <History size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            No hay cuentas pendientes o coincidencia con tu búsqueda.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
  );
}
