'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Eye, Printer, RotateCcw, Calendar, User, MapPin, Tag, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function VentasHistoryClient({
  initialSales,
  branches,
  users,
  currentBranch,
  timezone
}: {
  initialSales: any[];
  branches: any[];
  users: any[];
  currentBranch: any;
  timezone: string;
}) {
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterBranch, setFilterBranch] = useState(currentBranch.id === 'GLOBAL' ? '' : currentBranch.id);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterCfdi, setFilterCfdi] = useState('');

  // Extract unique statuses present in sales
  const statuses = useMemo(() => {
    const sSet = new Set<string>();
    initialSales.forEach(s => {
      if (s.status) sSet.add(s.status);
    });
    return Array.from(sSet);
  }, [initialSales]);

  // Filter logic
  const filteredSales = useMemo(() => {
    return initialSales.filter(sale => {
      // Date filter
      if (filterDate) {
        const saleDateStr = new Date(sale.createdAt).toLocaleDateString('sv-SE', { timeZone: timezone });
        if (saleDateStr !== filterDate) return false;
      }
      
      // User filter
      if (filterUser && sale.userId !== filterUser) {
        return false;
      }

      // Branch filter
      if (filterBranch && sale.branchId !== filterBranch) {
        return false;
      }

      // Status filter
      if (filterStatus && sale.status !== filterStatus) {
        return false;
      }

      // Client filter
      if (filterClient) {
        const clientName = sale.customer?.name || '';
        if (!clientName.toLowerCase().includes(filterClient.toLowerCase())) {
          return false;
        }
      }

      // CFDI filter
      if (filterCfdi) {
        const folioCfdi = sale.invoiceId || '';
        if (!folioCfdi.toLowerCase().includes(filterCfdi.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [initialSales, filterDate, filterUser, filterBranch, filterStatus, filterClient, filterCfdi]);

  const hasActiveFilters = filterDate || filterUser || (currentBranch.id === 'GLOBAL' && filterBranch) || filterStatus || filterClient || filterCfdi;

  const handleClearFilters = () => {
    setFilterDate('');
    setFilterUser('');
    setFilterBranch(currentBranch.id === 'GLOBAL' ? '' : currentBranch.id);
    setFilterStatus('');
    setFilterClient('');
    setFilterCfdi('');
  };

  return (
    <div>
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-header-title" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Historial de Ventas</h1>
          <p className="page-header-subtitle" style={{ color: 'var(--caanma-text-muted)', margin: 0 }}>Módulo de ventas y cortes de caja</p>
        </div>
        <div className="page-header-actions">
          <Link href="/ventas/nueva" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            + Nueva Venta / TPV
          </Link>
        </div>
      </div>

      {/* Filters Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        padding: '1.25rem', 
        backgroundColor: '#f8fafc', 
        borderRadius: '12px', 
        border: '1px solid var(--caanma-border)' 
      }}>
        {/* Date Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Calendar size={14} /> Fecha
          </label>
          <input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* Client Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <User size={14} /> Cliente
          </label>
          <input 
            type="text" 
            placeholder="Buscar por cliente" 
            value={filterClient} 
            onChange={(e) => setFilterClient(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* CFDI Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Receipt size={14} /> Folio CFDI
          </label>
          <input 
            type="text" 
            placeholder="Buscar folio CFDI" 
            value={filterCfdi} 
            onChange={(e) => setFilterCfdi(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }} 
          />
        </div>

        {/* Seller Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <User size={14} /> Vendedor
          </label>
          <select 
            value={filterUser} 
            onChange={(e) => setFilterUser(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los vendedores</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <MapPin size={14} /> Sucursal
          </label>
          <select 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value)} 
            disabled={currentBranch.id !== 'GLOBAL'}
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: currentBranch.id !== 'GLOBAL' ? '#f1f5f9' : 'white', fontSize: '0.9rem' }}
          >
            {currentBranch.id === 'GLOBAL' ? (
              <>
                <option value="">Todas las sucursales</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </>
            ) : (
              <option value={currentBranch.id}>{currentBranch.name}</option>
            )}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--caanma-text-muted)', marginBottom: '0.5rem' }}>
            <Tag size={14} /> Estado
          </label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.9rem' }}
          >
            <option value="">Todos los estados</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'COMPLETED' ? 'Completado' : status === 'CANCELLED' ? 'Cancelado' : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button 
            type="button" 
            onClick={handleClearFilters}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#dc2626', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
          >
            <RotateCcw size={14} /> Limpiar Filtros
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="card">
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>ID Venta</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Fecha / Hora</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Cliente</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Folio CFDI</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500' }}>Sucursal / Vendedor</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right' }}>Artículos</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'center' }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--caanma-text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => {
              const qtySum = sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
              return (
                <tr key={sale.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                  <td data-label="ID Venta" style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {sale.folio || sale.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td data-label="Fecha / Hora" style={{ padding: '1rem' }}>
                    {new Date(sale.createdAt).toLocaleString('es-MX', { timeZone: timezone })}
                  </td>
                  <td data-label="Cliente" style={{ padding: '1rem' }}>
                    {sale.customer ? (
                      <div style={{ fontWeight: '500' }}>{sale.customer.name}</div>
                    ) : (
                      <div style={{ color: 'var(--caanma-text-muted)', fontStyle: 'italic' }}>Público General</div>
                    )}
                  </td>
                  <td data-label="Folio CFDI" style={{ padding: '1rem' }}>
                    {sale.invoiceId ? (
                      <a 
                        href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold', 
                          color: '#1d4ed8', 
                          backgroundColor: '#eff6ff', 
                          border: '1px solid #bfdbfe',
                          padding: '0.2rem 0.4rem', 
                          borderRadius: '4px',
                          textDecoration: 'none',
                          display: 'inline-block'
                        }} 
                        title="Ver PDF de la Factura (CFDI)"
                      >
                        {sale.invoiceId.substring(0, 8).toUpperCase()}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--caanma-text-muted)' }}>-</span>
                    )}
                  </td>
                  <td data-label="Sucursal / Vendedor" style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500' }}>{sale.branch?.name || currentBranch.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--caanma-text-muted)' }}>Vendió: {sale.user.name}</div>
                  </td>
                  <td data-label="Artículos" style={{ padding: '1rem', textAlign: 'right', color: 'var(--caanma-text-muted)' }}>
                    {new Intl.NumberFormat('es-MX').format(qtySum)} Pzas
                  </td>
                  <td data-label="Total" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(sale.total)}
                  </td>
                  <td data-label="Estado" style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: sale.status === 'COMPLETED' ? '#dcfce7' : sale.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                      color: sale.status === 'COMPLETED' ? '#166534' : sale.status === 'CANCELLED' ? '#991b1b' : '#334155'
                    }}>
                      {sale.status === 'COMPLETED' ? 'Completado' : sale.status === 'CANCELLED' ? 'Cancelado' : sale.status}
                    </span>
                  </td>
                  <td data-label="Acciones" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <Link href={`/ventas/detalle/${sale.id}`} style={{ padding: '0.25rem', color: '#64748b', display: 'flex', alignItems: 'center' }} title="Ver Detalle">
                        <Eye size={20} />
                      </Link>
                      <Link target="_blank" href={`/ventas/detalle/${sale.id}/imprimir`} style={{ padding: '0.25rem', color: '#64748b', display: 'flex', alignItems: 'center' }} title="Imprimir Nota (A4)">
                        <Printer size={20} />
                      </Link>
                      <Link target="_blank" href={`/ventas/detalle/${sale.id}/imprimir-ticket`} style={{ padding: '0.25rem', color: '#64748b', display: 'flex', alignItems: 'center' }} title="Imprimir Ticket Térmico">
                        <Receipt size={20} />
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  No se encontraron ventas con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
