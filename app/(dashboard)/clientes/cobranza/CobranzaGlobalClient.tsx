'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, History, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CobranzaGlobalClient({ initialData }: { initialData: any[] }) {
  const [search, setSearch] = useState('');

  const filteredSales = initialData.filter(sale => {
    const term = search.toLowerCase();
    const customerMatch = sale.customer?.name?.toLowerCase().includes(term);
    const saleIdMatch = sale.id.toLowerCase().includes(term);
    return customerMatch || saleIdMatch;
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
                Deuda Global Filtrada: {formatCurrency(totalDeudaGlobal)}
            </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Cliente</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Folio / Ticket</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Fecha de Creación</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Vencimiento</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Deuda Actual</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Acción</th>
                </tr>
            </thead>
            <tbody>
                {filteredSales.map((sale: any) => {
                    const overdue = sale.dueDate ? new Date(sale.dueDate) < new Date() : false;
                    return (
                        <tr key={sale.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                {sale.customer?.name || 'Venta de Mostrador'}
                            </td>
                            <td style={{ padding: '1rem', color: '#64748b' }}>#{sale.id.slice(0,8).toUpperCase()}</td>
                            <td style={{ padding: '1rem', color: '#64748b' }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold', color: overdue ? '#dc2626' : '#16a34a' }}>
                                {sale.dueDate ? new Date(sale.dueDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td style={{ padding: '1rem', fontWeight: 'bold', color: '#dc2626', fontSize: '1.1rem' }}>
                                {formatCurrency(sale.balanceDue)}
                            </td>
                            <td style={{ padding: '1rem' }}>
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
